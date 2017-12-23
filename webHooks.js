'use strict';

// https://developers.google.com/actions/reference/nodejs/DialogflowApp
// note that the package "actions-on-google" has two intefaces:
// DialogflowApp supports Dialogflow web hooks
// ActionsSdkApp provides an interface to the Actions SDK (not used here)
// const { DialogflowApp } = require('actions-on-google');

// HTTP server support
const express = require('express');
const bodyParser = require('body-parser');

// todo - add "morgan" or something to create log files

// artnet "library"
const { ArtNet } = require("./ArtNet.js");

// load this app's configuration data
const {
  teamNameToColorsMap,
  colorNameToChannelDataMap,
  commands,
  elements,
  treeDirectiveDuration,
  maxRequestsPerSession,
  universes,
  factCategories
} = require('./config.js');

// TODO - what is this?
process.env.DEBUG = 'actions-on-google:*';

//////////////////////////////////////////////////////////////////////////////
// sessionDataCache is keyed by session id from Dialogflow
// The session data object is the value of the map.
// The session data object contains a sequence number, creation data, and last used date.
const sessionDataCache = new Map();
const maxSessionCount = 2;
let sessionCounter = 0;

function removeOldSessionsFromCache() {
  // remove old sessions when the cache is full
  while (sessionDataCache.length > maxSessionCount) {
    let sessiondIdToDelete = undefined;
    let sessionDataToDelete = undefined;
    for (const sessionId of sessionDataCache.keys()) {
      // delete oldest session
      const sessionData = sessionDataCache.get(sessionId);
      if (sessionData.lastUsedTimpestamp < sessionToDelete.lastUsedTimpestamp) {
        sessionIdToDelete = sessionId;
        sessionDataToDelete = sessionData;
      }
    }
    if (sessiondIdToDelete) {
      console.log(`removing oldest sessionData: sessionId=${sessiondIdToDelete}`)
      sessionDataCache.delete(sessiondIdToDelete);
    }
  }
}

function getSessionData(sessionId) {
  let sessionData = sessionDataCache.get(sessionId);
  if (sessionData === undefined) {
    sessionData = { sequence: sessionCounter++, creationTimestamp: new Date(), requests: 0 };
    sessionDataCache.set(sessionId, sessionData);
    console.log(`creatingSessionData: sessionId=${sessionId}`)
  }
  // console.log(`getSessionData: session=${sessionId} data=${sessionDataCache[sessionId]}`);

  removeOldSessionsFromCache();

  return sessionData;
}

//////////////////////////////////////////////////////////////////////////////
// DirectiveQueue
//   Directives are channel updates with a duration.
//   The duration delays processiong of the nest message in the queue.
//////////////////////////////////////////////////////////////////////////////

function setChannelData(directive) {
  // if (directive.universe > 0) {
  //   console.log(`setChannelData: universe=${directive.universe} channel=${directive.channelNumber}
  //     data=${directive.channelData}`);
  // }
  artnet.setChannelData(directive.universe,
    directive.channelNumber,
    directive.channelData);
  artnet.send(directive.universe);
}

class DirectiveQueue {
  constructor() {
    this.oldestIndex = 1;
    this.newestIndex = 1;
    this.directives = {};
    this.thottleTimerId
  }

  getSize() {
    return this.newestIndex - this.oldestIndex;
  }

  getCountForSession(sessionId) {
    let count = 0;
    for (let index = this.oldestIndex; index < this.newestIndex; index++) {
      let directive = this.directives[index];
      if (directive.sessionId === sessionId) {
        count++;
      }
    }
    return count;
  }

  enqueue(directive) {
    if (Array.isArray(directive)) {
      for (let arrayIndex = 0; arrayIndex < directive.length; arrayIndex++) {
        this.directives[this.newestIndex] = directive[arrayIndex];
        this.newestIndex++;
      }
    } else {
      this.directives[this.newestIndex] = directive;
      this.newestIndex++;
    }
    this.sendNextDirective();
  }

  dequeue() {
    const oldestIndex = this.oldestIndex;
    const newestIndex = this.newestIndex;
    let directive;
 
    if (oldestIndex !== newestIndex) {
      directive = this.directives[oldestIndex];
      delete this.directives[oldestIndex];
      this.oldestIndex++;
      return directive;
    }
    return undefined;
  }

  sendNextDirective() {
    if (this.thottleTimerId === undefined || this.thottleTimerId === null) {
      let directive = this.dequeue();
      if (directive) {
        setChannelData(directive);
        const duration = directive.duration;
        if (duration !== undefined && duration !== null) {
          this.thottleTimerId = setTimeout(
            this.onThrottleTimeout.bind(this), duration);
        }
      }
    }
  }
  
  onThrottleTimeout(universe) {
    this.thottleTimerId = null;
    this.sendNextDirective();
  }
}

const directiveQueues = { };

function getQueueForElement(elementName) {
  const elementInfo = elements[elementName.toLowerCase()];
  const queueName = elementInfo.queueName;
  let queue = directiveQueues[queueName];
  if (queue === null || queue === undefined) {
    queue = new DirectiveQueue();
    directiveQueues[queueName] = queue;
    console.log(`Creating queue ${queueName} for ${elementName}`)
  }
  return queue;
}

function enqueueDirectives(directives) {
  let queueMessage = '';
  if (Array.isArray(directives)) {
    for (let arrayIndex = 0; arrayIndex < directives.length; arrayIndex++) {
      enqueueOneDirective(directives[arrayIndex]);
    }
  } else {
    queueMessage = enqueueOneDirective(directives);
  }
  return queueMessage;
}

function enqueueOneDirective(directive) {
  if (directive !== null && directive !== undefined) {
    let queue = getQueueForElement(directive.elementName);
    queue.enqueue(directive);
    const size = queue.getSize();
    if (size == 1) {
      return `(There is one request ahead of yours.)`;
    } else if (size > 1) {
      return `(There are ${queue.getSize()} requests ahead of yours.)`;
    }
  }
  return '';
}

function checkOverUse(sessionId, elementName) {
  let message = null;

  const queue = getQueueForElement(elementName);

  if (queue.getCountForSession(sessionId) >= maxRequestsPerSession) {
    message = `You have two many requests in the queue now.  Please try again in a few minutes.`;
  }

  return message;
}

//////////////////////////////////////////////////////////////////////////////
// The ArtNet interface
//////////////////////////////////////////////////////////////////////////////

const artnet = new ArtNet();

//////////////////////////////////////////////////////////////////////////////
// functions to support fact requests
//////////////////////////////////////////////////////////////////////////////

// create an array that contains the indexes of each element of another array
function createArrayOfIndexes(anArray) {
  const indexes = [];
  for (let index = 0; index < anArray.length; index++) {
    indexes[index] = index;
  }
  return indexes;
}

// extract a random element from an array
function extractRandomElement(anArray) {
  if (!anArray.length) {
    return null;
  }

  const index = Math.floor(Math.random() * anArray.length);
  const element = anArray[index];

  // Delete the element
  anArray.splice(index, 1);
  return element;
}

// get an unused fact
// This also stores the list of unused facts for the category in the app data
// api.ai maintains app.data as "session data"
function getUnusedFacts(request, categoryName) {
  const sessionData = getSessionData(request.sessionId);
  
  if (sessionData.unusedFacts === undefined) {
    sessionData.unusedFacts = {};
  }

  if (sessionData.unusedFacts[categoryName] === undefined) {
    // Initialize unusedFacts with list of all facts
    const category = factCategories.get(categoryName);
    sessionData.unusedFacts[categoryName] = createArrayOfIndexes(category.facts);
  }

  console.log(
    `cat=${categoryName} unused=${sessionData.unusedFacts[categoryName].length}`);
 
  return sessionData.unusedFacts[categoryName];
}

// returns the names of unfinished categories
function getUnfinishedCategoryNames(request) {
  const unfinishedCategoryNames = [];

  for (const categoryName of factCategories.keys()) {
    console.log(`checking ${categoryName}`);
    if (getUnusedFacts(request, categoryName).length > 0) {
      unfinishedCategoryNames.push(categoryName);
    }
  }

  return unfinishedCategoryNames;
}

function getRandomFact(request, response) {
  // lookup category
  const categoryName = request.parameters.categoryName;
  if (categoryName == undefined || categoryName == null) {
    console.error('category name is missing');
    sendCategorySuggestions(request, response, categoryName);
    return;
  }
  const category = factCategories.get(categoryName);
  if (category == undefined|| category == null) {
    console.error(`${categoryName} category is unrecognized`);
    sendCategorySuggestions(request, response, categoryName);
    return;
  }

  // get a fact
  const unusedFactsForCategory = getUnusedFacts(request, categoryName);
  const element = extractRandomElement(unusedFactsForCategory);
  if (element == null || element == undefined) {
    sendCategorySuggestions(request, response, categoryName);
    return;
  }
  sendFact(request, response, category, category.facts[element]);
}

function sendFact(request, response, category, fact) {
  const factPrefix = category.factPrefix;

  let factText = null;
  let imageUrl = null;
  let imageName = null;
  let link = null;
  
  if (typeof fact === "string") {
    factText = fact;
  } else {
    factText = fact.fact;
    // imageUrl = fact.imageUrl;
    // imageName = fact.imageName;
    // link = fact.link;
  }

  fillResponse(request, response, factText);
}

function sendCategorySuggestions(request, response, categoryName) {
  const unfinishedCategoryNames = getUnfinishedCategoryNames(request);
  if (unfinishedCategoryNames.length == 0) {
    fillResponse(request, response,
      "Looks like you've heard all my random facts! Try asking me questions.");
    return;
  }
  fillResponse(request, response, 
    `You have heard everything I know about ${categoryName}. Ask me about the ${unfinishedCategoryNames[0]}.`);
}

//////////////////////////////////////////////////////////////////////////////
// setElementColor
//////////////////////////////////////////////////////////////////////////////

function setElementColor(request, response) {
  const elementName = request.parameters.elementName;
  if (elementName === undefined || elementName == null) {
    console.error('webhook::setElementColor - missing elementName');
    return;
  }
  
  const elementInfo = elements[elementName];
  if (elementInfo === undefined || elementInfo === null) {
    console.error(`webhook::setElementColor - ${elementName} is not a valid elemenet name.`);
    return;
  }

  const overUseMessage = checkOverUse(request.sessionId, elementName);
  if (overUseMessage != null && overUseMessage != undefined) {
    fillResponse(request, response, overUseMessage);
    return; 
  }
  
  let elementNumber = request.parameters.elementNumber;
  if (elementNumber === undefined || elementNumber == null) {
    elementNumber = 1;
  }
  const elementCount = elementInfo.count;
  if (elementCount) {
    if (elementNumber < 1 || elementNumber > elementCount) {
      fillResponse(request, response,
        `You need to choose ${elementName} between 1 and ${elementCount}. Sorry!`);
      return;
      }
  }
  
  const colorName = request.parameters.colorName;
  if (colorName === undefined || colorName == null) {
    console.error('webhook::setElementColor - missing colorName');
    return;
  }
  const colorChannelData = colorNameToChannelDataMap[colorName];
  if (colorChannelData === undefined) {
    console.error(`webhook::setElementColor - Invalid color ${colorName}`);
    return;
  }

  let directive = {};

  directive.sessionId = request.sessionId;
  directive.elementName = elementName;
  directive.universe = elementInfo.universe;
  directive.channelNumber = elementInfo.startChannel + (elementInfo.channelsPerElement)*(elementNumber - 1);
  directive.channelData = colorChannelData;
  directive.duration = treeDirectiveDuration;

  // console.log(`setElementColor: universe=${directive.universe} channel=${directive.channelNumber} data=${directive.channelData}`);

  const queueMessage = enqueueDirectives(directive);

  let message = (!elementNumber)
    ? `Changing the color of ${elementName} to ${colorName}. ${queueMessage} Happy Holidays!`
    : `Changing the color of ${elementName} ${elementNumber} to ${colorName}. ${queueMessage} Happy Holidays!`;

  fillResponse(request, response, message);    
}

//////////////////////////////////////////////////////////////////////////////
// setAllElementColors 
//////////////////////////////////////////////////////////////////////////////

function setAllElementColors(request, response) {
  // console.log("setAllElementColors");

  const elementName = request.parameters.elementName;
  if (elementName === undefined || elementName == null) {
    console.error('webhook::setAllElementColors - missing elementName');
    return;
  }
  // console.log("setAllElementColors, elementName" + elementName);  

  const elementInfo = elements[elementName];
  if (elementInfo === undefined || elementInfo === null) {
    console.error(`webhook::setAllElementColors - ${elementName} is not a valid elemenet name.`);
    return;
  }

  const overUseMessage = checkOverUse(request.sessionId, elementName);
  if (overUseMessage != null && overUseMessage != undefined) {
    fillResponse(request, response, overUseMessage);
    return; 
  }
    
  const colorNames = request.parameters.colorNames;
  // console.log("setAllElementColors, colorNames=", colorNames);  
  if (colorNames === undefined || colorNames == null) {
    console.error('webhook::setAllElementColors - missing colorNames');
    return;
  }

  let colorIndex = -1;
  let colorName = 'black';
  if (!Array.isArray(colorNames)) {
    colorName = colorNames;
  }

  const elementCount = elementInfo.count;
  // console.log("setAllElementColors, elementCount=" + elementCount);  

  let channelData = [];
  for (let elementNumber = 1; elementNumber <= elementCount; elementNumber++) {
    if (Array.isArray(colorNames)) {
      colorIndex++;
      if (colorIndex === colorNames.length) {
        colorIndex = 0;
      }
      // console.log("setAllElementColors, colorIndex=", colorIndex);
      colorName = colorNames[colorIndex];
    }

    // console.log("setAllElementColors, colorName=", colorName);  
    const colorChannelData = colorNameToChannelDataMap[colorName];
    // console.log("setAllElementColors, colorChannelData=", colorChannelData);  
    if (colorChannelData === undefined) {
      console.error(`webhook::setAllElementColors - invalid color ${colorName}`);
     return;
    }

    const elementStartIndex = (elementInfo.channelsPerElement)*(elementNumber - 1);
    for (let rgbIndex = 0; rgbIndex < colorChannelData.length; rgbIndex++) {
      channelData[elementStartIndex + rgbIndex] = colorChannelData[rgbIndex];
    }
  }
  
  let directive = {};

  directive.sessionId = request.sessionId;
  directive.elementName = elementName;
  directive.universe = elementInfo.universe;
  directive.channelNumber = elementInfo.startChannel;
  directive.channelData = channelData;
  directive.duration = treeDirectiveDuration;
  
  const queueMessage = enqueueDirectives(directive);

  let colorMessage = "";
  if (Array.isArray(colorNames)) {
    for (let index = 0; index < colorNames.length; index++) {
      const name = colorNames[index];
      if (index > 0) {
        if (index == colorNames.length - 1) {
          colorMessage += (" and ");
        } else {
          colorMessage += (", ");
        }
      }
      colorMessage += (name);
    }
  } else {
    colorMessage = colorNames;
  }
   

  // console.log(`setAllElementColors: universe=${directive.universe} channel=${directive.channelNumber} data=${directive.channelData}`);
  let message = `Setting colors of ${elementName}s to ${colorMessage}. ${queueMessage} Happy Holidays!`;
  fillResponse(request, response, message);    
}

//////////////////////////////////////////////////////////////////////////////
// setAllElementColorsByRgb 
//////////////////////////////////////////////////////////////////////////////

function setAllElementColorsByRgb(request, response) {
  // console.log("setAllElementColorByRGB");
  const elementName = request.parameters.elementName;
  if (elementName === undefined || elementName == null) {
    console.error('webhook::setAllElementColorsByRgb - missing elementName');
    return;
  }
  // console.log("setAllElementColorsByRgb, elementName" + elementName);  

  const elementInfo = elements[elementName];
  if (elementInfo === undefined || elementInfo === null) {
    console.error(`webhook::setAllElementColorsByRgb - ${elementName} is not a valid elemenet name.`);
    return;
  }

  const overUseMessage = checkOverUse(request.sessionId, elementName);
  if (overUseMessage != null && overUseMessage != undefined) {
    fillResponse(request, response, overUseMessage);
    return; 
  }
  
  let red = request.parameters.red;
  if (red === undefined || red == null) {
    console.error('webhook::setAllElementColorByRGB - missing red');
    fillResponse(request, response, `*** missing red ***`);
    return;
  } else {
    if (red < 0 || red > 255) {
      console.error('webhook::setAllElementColorByRGB - red must be 0 to 255');
      fillResponse(request, response, `*** red must be 0 to 255 ***`);
      return;
      }
  }
  let green = request.parameters.green;
  if (green === undefined || green == null) {
    console.error('webhook::setAllElementColorByRGB - missing green');
    fillResponse(request, response, `*** missing green ***`);
    return;
  } else {
    if (green < 0 || green > 255) {
      console.error('webhook::setAllElementColorByRGB - green must be 0 to 255');
      fillResponse(request, response, `*** green must be 0 to 255 ***`);
      return;
      }
  }
  let blue = request.parameters.blue;
  if (blue === undefined || blue == null) {
    console.error('webhook::setAllElementColorByRGB - missing blue');
    fillResponse(request, response, `*** missing blue ***`);
    return;
  } else {
    if (blue < 0 || blue > 255) {
      console.error('webhook::setAllElementColorByRGB - blue must be 0 to 255');
      fillResponse(request, response, `*** blue must be 0 to 255 ***`);
      return;
      }
  }
  const rgb = [ red, green, blue ];

  const elementCount = elementInfo.count;
  // console.log("setAllElementColorByRGB, elementCount=" + elementCount);  

  let channelData = [];
  for (let elementNumber = 1; elementNumber <= elementCount; elementNumber++) {
    const elementStartIndex = (elementInfo.channelsPerElement)*(elementNumber - 1);
    for (let rgbIndex = 0; rgbIndex < rgb.length; rgbIndex++) {
      channelData[elementStartIndex + rgbIndex] = rgb[rgbIndex];
    }
  }
  
  let directive = {};

  directive.sessionId = request.sessionId;
  directive.elementName = elementName;
  directive.universe = elementInfo.universe;
  directive.channelNumber = elementInfo.startChannel;
  directive.channelData = channelData; 
  directive.duration = treeDirectiveDuration;
  
  const queueMessage = enqueueDirectives(directive);  
  
  // console.log(`setAllElementColorsByRgb: universe=${directive.universe} channel=${directive.channelNumber} data=${directive.channelData}`);
  let message = `Changing the ${elementName}s to ${red}, ${green}, ${blue}. ${queueMessage} Happy Holidays!`;
  fillResponse(request, response, message);    
}

//////////////////////////////////////////////////////////////////////////////
// do command 
//////////////////////////////////////////////////////////////////////////////

function doCommand(request, response) {
  // console.log("doCommand");
  
  let commandName = request.parameters.commandName;
  if (commandName === undefined || commandName == null) {
    console.error('webhook::doCommand - missing commandName');
    return;
  }

  let commandInfo = commands[commandName.toLowerCase()];
  if (commandInfo === undefined || commandInfo === null) {
    console.error(`webhook::doCommand - invalid commandName ${commandName}`);
    return;
  }

  const elementName = request.parameters.elementName;
  if (elementName === undefined || elementName == null) {
    console.error('webhook::doCommand - missing elementName');
    return;
  }

  const elementInfo = elements[elementName.toLowerCase()];
  if (elementInfo === undefined || elementInfo === null) {
    console.error(`webhook::doCommand - invalid elementName ${elementName}.`);
    return;
  }

  const overUseMessage = checkOverUse(request.sessionId, elementName);
  if (overUseMessage != null && overUseMessage != undefined) {
    fillResponse(request, response, overUseMessage);
    return; 
  }
  
  const elementCount = elementInfo.count;
  const elementType = elementInfo.elementType;
  
  const commandElementInfo = commandInfo[elementType.toLowerCase()];
  if (commandElementInfo === undefined || commandElementInfo === null) {
    console.error(`webhook::doCommand - there is no ${commandName} command for ${elementType}.`);
    return;
  }

  //console.log(`doCommand, commandName=${commandName} elementName=${elementName} type=${elementType}`);  
  
  let prototypes = [] = commandElementInfo.directives;
  if (prototypes === undefined || prototypes === null) {
    console.error(`webhook::doCommand - there is no directives for ${commandName} command for ${elementName}.`);
    return;
  }  

  const directives = [];
  for (let index = 0; index < prototypes.length; index++) {
    const prototype = prototypes[index];

    const directive = {
      sessionId: request.sessionId,
      elementName: elementName,
      universe: elementInfo.universe,
      channelNumber: elementInfo.startChannel,
      channelData: prototype.channelData,
      duration: prototype.duration
    };
    directives.push(directive);

    // console.log(`doCommand: ${JSON.stringify(directives)}`);
  };

  const queueMessage = enqueueDirectives(directives);
  
  let message = `Making ${elementName} ${commandName}. ${queueMessage} Happy Holidays!`;
  fillResponse(request, response, message);    
}

//////////////////////////////////////////////////////////////////////////////
// cheer 
//////////////////////////////////////////////////////////////////////////////

function cheer(request, response) {
  let teamName = request.parameters.teamName;
  if (teamName === undefined || teamName == null) {
    console.error('webhook::cheer - missing teamName');
    return;
  }

  const elementName = 'tree';
  const elementInfo = elements[elementName];
  if (elementInfo === undefined || elementInfo === null) {
    console.error(`webhook::cheer - ${elementName} is not a valid elemenet name.`);
    return;
  }

  const overUseMessage = checkOverUse(request.sessionId, elementName);
  if (overUseMessage != null && overUseMessage != undefined) {
    fillResponse(request, response, overUseMessage);
    return; 
  }
   
  const colorNames = teamNameToColorsMap[teamName];
  if (!colorNames || colorNames == null) {
    console.error(`webhook::cheer - Invalid team name ${teamName}.`);
    return;
  }

  let elementCount = elementInfo.count;
  let channelData = [];
  let colorIndex = -1;
  for (let elementNumber = 1; elementNumber <= elementCount; elementNumber++) {
    colorIndex++;
    if (colorIndex === colorNames.length) {
      colorIndex = 0;
    }
    const colorName = colorNames[colorIndex];
    const colorChannelData = colorNameToChannelDataMap[colorName];
    if (colorChannelData === undefined) {
      console.error(`webhook::cheer - invalid color ${colorName}`);
      return;
    }
    const elementStartIndex = (elementInfo.channelsPerElement)*(elementNumber - 1);
    for (let rgbIndex = 0; rgbIndex < colorChannelData.length; rgbIndex++) {
      channelData[elementStartIndex + rgbIndex] = colorChannelData[rgbIndex];
    }
  }
  
  let directive = {};

  directive.sessionId = request.sessionId;
  directive.elementName = elementName;
  directive.universe = elementInfo.universe,
  directive.channelNumber = elementInfo.startChannel,
  directive.channelData = channelData;
  directive.duration = treeDirectiveDuration;

  const queueMessage = enqueueDirectives(directive);
  
  // console.log(`cheer: universe=${directive.universe} channel=${directive.channelNumber} data=${directive.channelData}`);
  let message = `Go ${teamName}! Watch the trees cheer with you! ${queueMessage} Happy Holidays!`;
  fillResponse(request, response, message);
  
  return directive;
}


//////////////////////////////////////////////////////////////////////////////
// doSetChannelData 
//////////////////////////////////////////////////////////////////////////////

function doSetChannelData(request, response) {
  // console.log("doSetChannelData");

  const universe = request.parameters.universe;
  if (universe === undefined || universe == null) {
    console.error('webhook::doSetChannelData - missing universe');
    let message = `webhook::doSetChannelData - missing universe`;
    return;
  }
  // console.log("setAllElementColorsByRgb, elementName" + elementName);  

  const start = request.parameters.start;
  if (start === undefined || start === null) {
    console.error(`webhook::doSetChannelData - missing start`);
    let message = `webhook::doSetChannelData - missing start`;
    return;
  }

  const end = request.parameters.end;
  if (end === undefined || end === null) {
    end = start;
  }

  let values = request.parameters.values;
  if (values === undefined || values === null) {
    values = [ 255 ];
  }
  if (!Array.isArray(values)) {
    values = [ values ];
  }

  if (start < 1 || start > 512) {
    console.error('webhook::doSetChannelData - bad start');
    let message = `webhook::doSetChannelData - bad start`;
    fillResponse(request, response, message)
    return;
  }

  if (end < 1 || end > 512) {
    console.error('webhook::doSetChannelData - bad end');
    let message = `webhook::doSetChannelData - bad end`;
    fillResponse(request, response, message)
    return;
  }
  
  if (start > end) {
    console.error('webhook::doSetChannelData - start > end');
    let message = `webhook::doSetChannelData - start > end`;
    fillResponse(request, response, message)
    return;
  }

  let channelData = [];
  let valueIndex = -1;
  for (let index = 0; index < end-start+1; index++) {
    valueIndex++;
    if (valueIndex == values.length) {
      valueIndex = 0;
    }
    channelData[start + index - 1] = values[valueIndex];
  }    
  
  let directive = {};

  directive.universe = universe;
  directive.channelNumber = start;
  directive.channelData = channelData; 
  
  setChannelData(directive); 
  
  console.log(`doSetChannelData universe=${universe} start=${start} end=${end} values=${values}`);
  let message = `doSetChannelData universe=${universe} start=${start} end=${end} values=${values}`;
  fillResponse(request, response, message);    
}

//////////////////////////////////////////////////////////////////////////////
// map actions to functions
//////////////////////////////////////////////////////////////////////////////

// Create handlers for Dialogflow actions as well as a 'default' handler
const actionHandlers = {
  'cheer': cheer,

  'set.element.color': setElementColor,

  'set.all.element.colors': setAllElementColors,

  'set.all.element.colors.rgb': setAllElementColorsByRgb,

  'do.set.channel.data': doSetChannelData,

  'do.command': doCommand,
  
  'get.random.fact' : getRandomFact,

  'check.webhook.status': (request, response) => {
    let message = `The Farmstead Light's webhook server is running!`;
    fillResponse(request, response, message);
  },

  // The default welcome intent has been matched, so welcome the user
  // (https://dialogflow.com/docs/events#default_welcome_intent)
  'input.welcome': (request, response) => {
    fillResponse(request, response, 'Welcome to my Farmstead Lights agent!');
  },

  // The default fallback intent has been matched - no matching intent found.
  //  try to recover (https://dialogflow.com/docs/intents#fallback_intents)
  'input.unknown': (request, response) => {
    fillResponse(request, response, 'I\'m having trouble, can you try that again?');
  },

  // Default handler for unknown or undefined actions
  'default': (request, response) => {
    fillResponse(request, response,
      'I am unable to help you now - Sorry.  Please try again later.');
  }
};

//////////////////////////////////////////////////////////////////////////////
// Function to handle v2 webhook requests from Dialogflow
//////////////////////////////////////////////////////////////////////////////
function processV2Request (request, response) {
try
  {
    // An action is a string that identifies what the webhook should do.
    let action = (request.body.queryResult.action) ? request.body.queryResult.action : 'default';

    // If undefined or unknown action use the default handler
    if (!actionHandlers[action]) {
      action = 'default';
    }

    // Parameters are any entites that Dialogflow has extracted from the request.
    // https://dialogflow.com/docs/actions-and-parameters
    let parameters = request.body.queryResult.parameters || {};

    // Contexts are ids used to track and store conversation state
    // https://dialogflow.com/docs/contexts
    let contexts = request.body.queryResult.contexts;

    // Get the request source (Google Assistant, Slack, API, etc)
    let source = (request.body.originalDetectIntentRequest) ? request.body.originalDetectIntentRequest.source : undefined;

    // Get the session ID to differentiate calls from different users
    let sessionId = (request.body.session) ? request.body.session : undefined;

    // create a session id if needed
    if (sessionId == undefined || sessionId == null) {
      sessionId = "pseudoSession-" + ++sessionCounter;
    }
    // console.log(`request: sessionId=${sessionId}`);

    // get the sessiondata, this will create sessionData if needed
    let sessionData = getSessionData(sessionId);
  
    sessionData.requests++;
    sessionData.lastUsedTimeStamp = new Date();

    // Run the proper handler function to handle the request from Dialogflow
    actionHandlers[action]( { action, parameters, contexts, source, sessionId }, response);
  } catch (error) {
    console.error("processing Dialogflow error=", error);
    //fillResponse(request, response, "Oh! I am not feeling well. I have a bad web hook.");
  }
}

//////////////////////////////////////////////////////////////////////////////
// Function to send a "formatted" responses to Dialogflow.
// Dialogflow will use the reponse to sent a response to the user.
//////////////////////////////////////////////////////////////////////////////
function fillResponse(request, response, responsePackage) {
  // if the response is a string send it as a response to the user
  let formattedResponse = { "source": "farmsteadLightsWebhook"};

  if (typeof responsePackage === 'string') {
    formattedResponse = {fulfillmentText: responsePackage};
  } else {
    // If the response to the user includes rich responses or contexts send them to Dialogflow

    // Set the text response
    formattedResponse.fulfillmentText = responsePackage.fulfillmentText;

    // Optional: add rich messages for integrations
    // (https://dialogflow.com/docs/rich-messages)
    if (responsePackage.fulfillmentMessages) {
      formattedResponse.fulfillmentMessages = responsePackage.fulfillmentMessages;
    }

    // Optional: add contexts (https://dialogflow.com/docs/contexts)
    if (responsePackage.outputContexts) {
      formattedResponse.outputContexts = responsePackage.outputContexts;
    }

    // Optional: followupEventInputs
    // (https://dialogflow.com/docs/reference/api-v2/rest/v2beta1/WebhookResponse)
    if (responsePackage.followupEventInput) {
      formattedResponse.followupEventInput = responsePackage.followupEventInput;
    }
  }
  // if the web hook does not set output context, use the context
  // configured in intent
  if ((formattedResponse.outputContexts === undefined
        || formattedResponse.outputContexts === null)
       && request.contexts !== undefined) {
    formattedResponse.outputContexts = request.contexts;
  }

  // Send the response to Dialogflow
  response.json(formattedResponse);
  console.log(formattedResponse);
}

//////////////////////////////////////////////////////////////////////////////
// the "start-up" code
//////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////
// configure the universes
//////////////////////////////////////////////////////////////////////////////

for (let index = 0; index < universes.length; index++) {
  const universeConfiguration = universes[index];
  console.log(`webhook universeConfiguration=${JSON.stringify(universeConfiguration)}`);
  artnet.configureUniverse(universeConfiguration);
}

//////////////////////////////////////////////////////////////////////////////
// Configure and start the HTTP (webhook) server
//////////////////////////////////////////////////////////////////////////////

const server = express();

server.use(bodyParser.urlencoded( { extended: true } ) );

server.use(bodyParser.json());

server.post('/webhook', function(request, response) {
  try {
    // console.log('webhook post', 'body', request.body);

    if (request.body.queryResult) {
      processV2Request(request, response);
    } else {
      console.log('webhook response: Invalid Request (missing queryResult section)');
      return response.status(400).end('Invalid Request - expecting v2 Dialogflow webhook request');
    }
   } catch (error)
   {
      console.error('webhook caught error', error);
   }
});

server.get('/status', function(request, response) {
  return response.json({
      status: "Okay",
      source: 'webhook-farmstead-lights'
  });
});

const port = process.env.PORT || 8000;

server.listen(port, function() {
  console.log("webhook server starting; listening on port " + port);
});


//////////////////////////////////////////////////////////////////////////////
// test the elves
//////////////////////////////////////////////////////////////////////////////

// let counter = 0;

// function tick()
// {
//   let channelData = [];

//   let universe = 1;
//   let start = 1;
//   switch (counter%6) {
//     case 0:
//       start = 113;
//       channelData.length = 8;
//       channelData.fill(255);
//       universe = 1;
//       break;
//      case 1:
//       start = 121;
//       channelData.length = 8;
//       channelData.fill(255);
//       universe = 1;
//       break;
//     case 2:
//       start = 129;
//       channelData.length = 8;
//       channelData.fill(255);
//       universe = 2;
//       break;
//     case 3:
//       start = 137;
//       channelData.length = 8;
//       channelData.fill(255);
//       universe = 2;
//       break;
//     case 4:
//       channelData.length = 512;
//       channelData.fill(0);
//       universe = 1;
//       break;
//     case 5:
//       channelData.length = 512;
//       channelData.fill(0);
//       universe = 2;
//       break;
//   }

//   artnet.setChannelData(universe, start, channelData);
//   artnet.send(universe);
//   counter++;
//   setTimeout(tick, 5000);
// }

// tick();
