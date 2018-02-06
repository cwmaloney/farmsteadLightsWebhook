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

// File I/O
const fs = require('fs');

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
  ideCheckTimeout,
  maxElfIdleTime,
  maxTreesIdleTime, 
  idleColors,
  idleTeams,
  factCategories
} = require('./config.js');

const {
  systemPassword
} = require('./secerts.js');

// TODO - what is this?
process.env.DEBUG = 'actions-on-google:*';

//////////////////////////////////////////////////////////////////////////////
const { MessageQueue } = require("./MessageQueue.js");

const { NameManager } = require("./NameManager.js");


const nameManager = new NameManager();
const messageQueue = new MessageQueue();

console.log(`loading names  @${new Date()} ...`);
nameManager.loadNameLists();
console.log(`loading names complete  @${new Date()}`);

console.log(`loading message queue  @${new Date()} ...`);
messageQueue.loadMessages();
console.log(`loading messages complete  @${new Date()}`);

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
      if (sessionData.lastUsedTimestamp < sessionToDelete.lastUsedTimestamp) {
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
    console.log(`${sessionData.sequence}: creatingSessionData: sessionId=${sessionId.slice(-12)}`)
  }
  // console.log(`getSessionData: session=${sessionId} data=${sessionDataCache[sessionId]}`);

  removeOldSessionsFromCache();

  return sessionData;
}

function getTimestamp(now) {
  return `[${now.getMonth()+1}/${now.getDate()} ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}]`
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
    this.timerId = null;
    this.lastUsedTimestamp = null;
  }

  getSize() {
    return this.newestIndex - this.oldestIndex;
  }

  getRequestCount() {
    let count = 0;
    for (let index = this.oldestIndex; index < this.newestIndex; index++) {
      let directive = this.directives[index];
      if (directive.requestPlaceholder) {
        count++;
      }
    }
    return count;
  }

  getRequestCountForSession(sessionId) {
    let count = 0;
    for (let index = this.oldestIndex; index < this.newestIndex; index++) {
      let directive = this.directives[index];
      if (directive.sessionId === sessionId && directive.requestPlaceholder) {
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
    this.lastUsedTimestamp = new Date();
  }

  dequeue() {
    const oldestIndex = this.oldestIndex;
    const newestIndex = this.newestIndex;
    let directive;
 
    if (oldestIndex !== newestIndex) {
      this.lastUsedTimestamp = new Date();
      directive = this.directives[oldestIndex];
      delete this.directives[oldestIndex];
      this.oldestIndex++;
      return directive;
    }
    return undefined;
  }

  sendNextDirective() {
    if (this.timerId === undefined || this.timerId === null) {
      let directive = this.dequeue();
      if (directive && directive.universe !== undefined) {
        setChannelData(directive);
        const duration = directive.duration;
        if (duration !== undefined && duration !== null) {
          this.timerId = setTimeout(
            this.onThrottleTimeout.bind(this), duration);
        }
      }
    }
  }
  
  onThrottleTimeout(universe) {
    this.timerId = null;
    this.sendNextDirective();
  }
}

const directiveQueues = { };

function getQueueForElement(elementName) {
  const elementInfo = elements[elementName];
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
  if (Array.isArray(directives)) {
    for (let arrayIndex = 0; arrayIndex < directives.length; arrayIndex++) {
      enqueueOneDirective(directives[arrayIndex]);
    }
  } else {
    enqueueOneDirective(directives);
  }
}

function enqueueOneDirective(directive) {
  if (directive !== null && directive !== undefined) {
    let queue = getQueueForElement(directive.elementName);
    queue.enqueue(directive);
  }
}

function getQueueMessage(elementName) {
  const queue = getQueueForElement(elementName);
  const count = queue.getRequestCount();
  if (count == 1) {
    return `(There is one request ahead of yours.)`;
  } else if (count > 1) {
    return `(There are ${count} requests ahead of yours.)`;
  }
  return '';
}

function enqueueRequestPlaceholder(sessionId, elementName) {
  let directive = {};

  directive.sessionId = sessionId;
  directive.elementName = elementName;
  directive.requestPlaceholder = true;

  // console.log(`enqueueRequestPlaceholder: sessionId=${sessionId} elementName=${elementName}`);

  enqueueOneDirective(directive);
}

function checkOverUse(sessionId, elementName) {
  let message = null;

  const queue = getQueueForElement(elementName);

  if (queue.getRequestCountForSession(sessionId) >= maxRequestsPerSession) {
    message = `You have two many requests in the queue now.  Please try again in a few minutes.`;
  }

  return message;
}

//////////////////////////////////////////////////////////////////////////////
// Create an ArtNet interface object
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

  // console.log(`cat=${categoryName} unused=${sessionData.unusedFacts[categoryName].length}`);
 
  return sessionData.unusedFacts[categoryName];
}

// returns the names of unfinished categories
function getUnfinishedCategoryNames(request) {
  const unfinishedCategoryNames = [];

  for (const categoryName of factCategories.keys()) {
    // console.log(`checking ${categoryName}`);
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
// onSetElementColor
//////////////////////////////////////////////////////////////////////////////

function onSetElementColor(request, response) {
  const elementName = request.parameters.elementName;
  if (elementName === undefined || elementName == null) {
    console.error('webhook::onSetElementColor - missing elementName');
    return;
  }
  
  const elementInfo = elements[elementName];
  if (elementInfo === undefined || elementInfo === null) {
    console.error(`webhook::onSetElementColor - ${elementName} is not a valid elemenet name.`);
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
    console.error('webhook::onSetElementColor - missing colorName');
    return;
  }

  const overUseMessage = checkOverUse(request.sessionId, elementName);
  if (overUseMessage != null && overUseMessage != undefined) {
    fillResponse(request, response, overUseMessage);
    return; 
  }

  setElementColor(request.sessionId, colorName, elementName, elementNumber);
  
  const queueMessage = getQueueMessage(elementName);
  enqueueRequestPlaceholder(request.sessionId, elementName);

  let message = (!elementNumber)
    ? `Changing the color of ${elementName} to ${colorName}. ${queueMessage} Happy Holidays!`
    : `Changing the color of ${elementName} ${elementNumber} to ${colorName}. ${queueMessage} Happy Holidays!`;

  fillResponse(request, response, message);    
}

function setElementColor(sessionId, colorName, elementName, elementNumber) { 
  const elementInfo = elements[elementName];
  if (elementInfo === undefined || elementInfo === null) {
    console.error(`webhook::setElementColor - ${elementName} is not a valid elemenet name.`);
    return;
  }

  // does element have components?
  if (elementInfo.components !== undefined) {
    for (let index = 0; index < elementInfo.components.length; index++) {
      const component = elementInfo.components[index];
      setElementColor(sessionId, colorName, component.name, component.number);
    }
  } else {
    const colorChannelData = colorNameToChannelDataMap[colorName];
    if (colorChannelData === undefined) {
      console.error(`webhook::setElementColor - Invalid color ${colorName}`);
      return;
    }

    let directive = {};

    directive.sessionId = sessionId;
    directive.elementName = elementName;
    directive.universe = elementInfo.universe;
    directive.channelNumber = elementInfo.startChannel + (elementInfo.channelsPerElement)*(elementNumber - 1) + elementInfo.redChannel;
    directive.channelData = colorChannelData;

    // console.log(`setElementColor: universe=${directive.universe} channel=${directive.channelNumber} data=${directive.channelData}`);

    enqueueDirectives(directive);
  }
  
}

//////////////////////////////////////////////////////////////////////////////
// onSetElementColors 
//////////////////////////////////////////////////////////////////////////////

function onSetElementColors(request, response) {
  // console.log("onSetElementColors");

  const elementName = request.parameters.elementName;
  if (elementName === undefined || elementName == null) {
    console.error('webhook::onSetElementColors - missing elementName');
    return;
  }
  // console.log("onSetElementColors, elementName" + elementName);  

  const elementInfo = elements[elementName];
  if (elementInfo === undefined || elementInfo === null) {
    console.error(`webhook::onSetElementColors - ${elementName} is not a valid elemenet name.`);
    return;
  }

  const overUseMessage = checkOverUse(request.sessionId, elementName);
  if (overUseMessage != null && overUseMessage != undefined) {
    fillResponse(request, response, overUseMessage);
    return; 
  }
    
  const colorNames = request.parameters.colorNames;
  // console.log("onSetElementColors, colorNames=", colorNames);  
  if (colorNames === undefined || colorNames == null) {
    console.error('webhook::onSetElementColors - missing colorNames');
    return;
  }

  let colorIndex = -1;
  let colorName = 'black';
  if (!Array.isArray(colorNames)) {
    colorName = colorNames;
  }

  const elementCount = elementInfo.count;
  // console.log("onSetAllElementColors, elementCount=" + elementCount);  

  if (elementInfo.components !== undefined) {
    for (let index = 0; index < elementInfo.components.length; index++) {
      const component = elementInfo.components[index];
      if (Array.isArray(colorNames)) {
        colorIndex++;
        if (colorIndex === colorNames.length) {
          colorIndex = 0;
        }
        // console.log("onSetAllElementColors, colorIndex=", colorIndex);
        colorName = colorNames[colorIndex];
      }
      setElementColor(request.sessionId, colorName, component.name, component.number);
    }
  } else {
    if (Array.isArray(colorNames)) {
      colorIndex++;
      if (colorIndex === colorNames.length) {
        colorIndex = 0;
      }
      // console.log("onSetAllElementColors, colorIndex=", colorIndex);
      colorName = colorNames[colorIndex];
    }
    setElementColor(request.sessionId, colorName, elementName);
  }
  
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
   
  const queueMessage = getQueueMessage(elementName);
  enqueueRequestPlaceholder(request.sessionId, elementName);

  // console.log(`onSetAllElementColors: universe=${directive.universe} channel=${directive.channelNumber} data=${directive.channelData}`);
  let message = `Setting colors of ${elementName} to ${colorMessage}. ${queueMessage} Happy Holidays!`;
  fillResponse(request, response, message);    
}

//////////////////////////////////////////////////////////////////////////////
// onSetElementColorByRgb 
//////////////////////////////////////////////////////////////////////////////

function onSetElementColorByRgb(request, response) {
  // console.log("setAllElementColorByRGB");
  const elementName = request.parameters.elementName;
  if (elementName === undefined || elementName == null) {
    console.error('webhook::onSetElementColorByRgb - missing elementName');
    return;
  }
  // console.log("onSetElementColorByRgb, elementName" + elementName);  

  const elementInfo = elements[elementName];
  if (elementInfo === undefined || elementInfo === null) {
    console.error(`webhook::onSetElementColorByRgb - ${elementName} is not a valid elemenet name.`);
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
 
  setElementColor(request.sessionId, colorName, elementName, elementNumber);
  const queueMessage = getQueueMessage(elementName);
  enqueueRequestPlaceholder(request.sessionId, elementName);
  
  // console.log(`onSetElementColorByRgb: universe=${directive.universe} channel=${directive.channelNumber} data=${directive.channelData}`);
  let message = `Changing the ${elementName}s to ${red}, ${green}, ${blue}. ${queueMessage} ${queueMessage} `;
  fillResponse(request, response, message);    
}

function setElementColorByRgb(sessionId, rgb, elementName, elementNumber) {
  const elementInfo = elements[elementName];
  if (elementInfo === undefined || elementInfo === null) {
    console.error(`webhook::setElementColorByRgb - ${elementName} is not a valid elemenet name.`);
    return;
  }

  // does element have components?
  if (elementInfo.components !== undefined) {
    for (let index = 0; index < elementInfo.components; index++) {
      const component = elementInfo.components[index];
      setElementColor(sessionId, colorName, component.name, component.elementNumber);
    }
  } else {
    let directive = {};

    directive.sessionId = sessionId;
    directive.elementName = elementName;
    directive.universe = elementInfo.universe;
    directive.channelNumber = elementInfo.startChannel + (elementInfo.channelsPerElement)*(elementNumber - 1) + redChannel;
    directive.channelData = rgb;

    // console.log(`setElementColor: universe=${directive.universe} channel=${directive.channelNumber} data=${directive.channelData}`);

    enqueueDirectives(directive);
  }

}

//////////////////////////////////////////////////////////////////////////////
// onCommand 
//////////////////////////////////////////////////////////////////////////////

function onCommand(request, response) {
  // console.log("doCommand");
  
  let commandName = request.parameters.commandName;
  if (commandName === undefined || commandName == null) {
    console.error('webhook::doCommand - missing commandName');
    return;
  }

  let commandInfo = commands[commandName];
  if (commandInfo === undefined || commandInfo === null) {
    console.error(`webhook::doCommand - invalid commandName ${commandName}`);
    return;
  }

  const elementName = request.parameters.elementName;
  if (elementName === undefined || elementName == null) {
    console.error('webhook::doCommand - missing elementName');
    return;
  }

  const elementInfo = elements[elementName];
  if (elementInfo === undefined || elementInfo === null) {
    console.error(`webhook::doCommand - invalid elementName ${elementName}.`);
    return;
  }

  const overUseMessage = checkOverUse(request.sessionId, elementName);
  if (overUseMessage != null && overUseMessage != undefined) {
    fillResponse(request, response, overUseMessage);
    return; 
  }

  applyCommand(request.sessionId, commandName, elementName);
  const queueMessage = getQueueMessage(elementName);
  enqueueRequestPlaceholder(request.sessionId, elementName);

  let message = `Making ${elementName} ${commandName}. ${queueMessage} Happy Holidays!`;
  fillResponse(request, response, message);    
}


function applyCommand(sessionId, commandName, elementName, elementNumber) {
  const elementInfo = elements[elementName];
  if (elementInfo === undefined || elementInfo === null) {
    console.error(`webhook::applyCommand - invalid elementName ${elementName}.`);
    return;
  }

  // does element have components?
  if (elementInfo.components !== undefined) {
    for (let index = 0; index < elementInfo.components; index++) {
      const component = elementInfo.components[index];
      applyCommand(commandName, component.name, component.index);
    }
  } else {    
    const elementType = elementInfo.elementType;

    const commandInfo = commands[commandName];
    if (commandInfo === undefined || commandInfo === null) {
      console.error(`webhook::applyCommand - there is no ${commandName} command.`);
      return;
    }
    
    const commandElementInfo = commandInfo[elementType];
    if (commandElementInfo === undefined || commandElementInfo === null) {
      console.error(`webhook::applyCommand - there is no ${commandName} command for ${elementType}.`);
      return;
    }
  
    //console.log(`doCommand, commandName=${commandName} elementName=${elementName} type=${elementType}`);  
    
    let prototypes = [] = commandElementInfo.directives;
    if (prototypes === undefined || prototypes === null) {
      console.error(`webhook::applyCommand - there are no directives for ${elementName} ${commandName} .`);
      return;
    }

    if (elementNumber === undefined || elementNumber === null || elementNumber == 0) {
      elementNumber = 1;
    }
  
    const directives = [];
    for (let index = 0; index < prototypes.length; index++) {
      const prototype = prototypes[index];
  
      const directive = {
        sessionId: sessionId,
        elementName: elementName,
        universe: elementInfo.universe,
        channelNumber: elementInfo.startChannel + (elementInfo.channelsPerElement)*(elementNumber - 1),
        channelData: prototype.channelData,
        duration: prototype.duration
      };
      directives.push(directive);
  
      // console.log(`doCommand: ${JSON.stringify(directives)}`);
    }

    enqueueDirectives(directives);
  }
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

  // console.log(`cheer: ${teamName}`);

  const elementName = 'trees';

  const overUseMessage = checkOverUse(request.sessionId, elementName);
  if (overUseMessage != null && overUseMessage != undefined) {
    fillResponse(request, response, overUseMessage);
    return; 
  }

  const colorNames = teamNameToColorsMap[teamName];
  if (colorNames == undefined || colorNames == null) {
    console.error(`webhook::cheer - Invalid team name ${teamName}.`);
    return;
  }
  
  setElementToTeamColors(request.sessionId, teamName, elementName);
  
  const queueMessage = getQueueMessage(elementName);
  enqueueRequestPlaceholder(request.sessionId, elementName);

  let message = `Go ${teamName}! Watch the trees cheer with you! ${queueMessage} Happy Holidays!`;
  fillResponse(request, response, message);
}

function setElementToTeamColors(sessionId, teamName, elementName) {   
  const elementInfo = elements[elementName];
  if (elementInfo === undefined || elementInfo === null) {
    console.error(`webhook::setElementToTeamColors - ${elementName} is not a valid elemenet name.`);
    return;
  }

  const colorNames = teamNameToColorsMap[teamName];
  if (colorNames == undefined || colorNames == null) {
    console.error(`webhook::setElementToTeamColors - Invalid team name ${teamName}.`);
    return;
  }

  const components = elementInfo.components;
  if (components == undefined || components == null) {
    console.error(`webhook::setElementToTeamColors - Element does not have components ${elementName}.`);
    return;
  }

  let channelData = [];
  let colorIndex = -1;
  for (let componentIndex = 0; componentIndex < components.length; componentIndex++) {
    const component = components[componentIndex];
    colorIndex++;
    if (colorIndex === colorNames.length) {
      colorIndex = 0;
    }
    const colorName = colorNames[colorIndex];
    setElementColor(sessionId, colorName, component.name,component.number);
  }
}

//////////////////////////////////////////////////////////////////////////////
// onSetChannelData 
//////////////////////////////////////////////////////////////////////////////

function onSetChannelData(request, response) {
  // console.log("onSetChannelData");

  const universe = request.parameters.universe;
  if (universe === undefined || universe == null) {
    console.error('webhook::onSetChannelData - missing universe');
    let message = `webhook::onSetChannelData - missing universe`;
    return;
  }
  // console.log("onSetChannelData, elementName" + elementName);  

  const start = request.parameters.start;
  if (start === undefined || start === null) {
    console.error(`webhook::onSetChannelData - missing start`);
    let message = `webhook::onSetChannelData - missing start`;
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
    console.error('webhook::onSetChannelData - bad start');
    let message = `webhook::onSetChannelData - bad start`;
    fillResponse(request, response, message)
    return;
  }

  if (end < 1 || end > 512) {
    console.error('webhook::onSetChannelData - bad end');
    let message = `webhook::onSetChannelData - bad end`;
    fillResponse(request, response, message);
    return;
  }
  
  if (start > end) {
    console.error('webhook::onSetChannelData - start > end');
    let message = `webhook::onSetChannelData - start > end`;
    fillResponse(request, response, message);
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
  
  console.log(`onSetChannelData universe=${universe} start=${start} end=${end} values=${values}`);
  let message = `onSetChannelData universe=${universe} start=${start} end=${end} values=${values}`;
  fillResponse(request, response, message);    
}

//////////////////////////////////////////////////////////////////////////////
// addMessage 
//////////////////////////////////////////////////////////////////////////////

function addMessage(request, response) {
  let sender = request.parameters.sender;
  if (sender === undefined || sender == null) {
    console.error('webhook::addMessage - missing sender');
    return;
  }
 
  let recipient = request.parameters.recipient;
  if (recipient === undefined || recipient == null) {
    console.error('webhook::addMessage - missing recipient');
    return;
  }
 
  let messageType = request.parameters.messageType;
  if (messageType === undefined || messageType === null) {
    console.error('webhook::addMessage - missing messageType');
    return;
  }
 
  let date = request.parameters.date;
  let time = request.parameters.time;
 
  console.log(`addMessage: From: ${sender} To: ${recipient} Message: ${messageType} On: ${date} At: ${time}`);

  const overUseMessage = messageQueue.checkOverUse(request.sessionId);
  if (overUseMessage != null && overUseMessage != undefined) {
    fillResponse(request, response, overUseMessage);
    return; 
  }

  // check names
  let senderOkay = nameManager.isNameValid(sender);
  if (!senderOkay) {
    let message = "We do not recognize the sender name";
    fillResponse(request, response, message);
    return;
  }
  let recipientOkay = nameManager.isNameValid(recipient);
  if (!recipientOkay) {
    let message = "We do not recognize the recipient name";
    fillResponse(request, response, message);
    return;
  }

  const message = formatMessage(sender, recipient, messageType);
  
  console.log(`addMessage: ${message}, ${date}, ${time}`);
  const messageObject = messageQueue.addMessage(request.sessionId, message, date, time);

  let responseMessage = `*** We are currently testing Valentines so your message NOT be display. Try this in a few days. Watch for your message "${message}".`
  //let responseMessage = `Watch for your message "${message}"`;
  if (date) {
    responseMessage += ` on ${messageObject.date}`;
  } else if (time) {
    responseMessage += ` at ${messageObject.time}`;
  }
  responseMessage += `. Your message id is ${messageObject.id}.`;
  fillResponse(request, response, responseMessage);
}

function formatMessage(sender, recipient, messageType, date, time) {
  let message = ''

  if (messageType === "Valentine" || !messageType) {
    message = `${recipient}, Will you be my Valentine? ${sender}`;
  } else if (messageType === "love") {
    message = `${recipient}, I love you, ${sender}`;
  } else if (messageType === "like") {
    message = `${recipient}, I like you, ${sender}`;
  } else if (messageType === "marry") {
    message = `${recipient}, Will you marry me? ${sender}`;
  } else if (messageType == "friend") {
    message = `${recipient}, Thank you for being my friend, ${sender}`;
  }

  return message;
}

//////////////////////////////////////////////////////////////////////////////
// checkName 
//////////////////////////////////////////////////////////////////////////////

function checkName(request, response) {
  let name = request.parameters.name;
  if (name === undefined || name == null) {
    console.error('webhook::checkName - missing name');
    return;
  }

  console.log(`checkName: ${name}`);

  // check name
  let nameOkay = nameManager.isNameValid(name);

  let responseMessage = '';
  if (!nameOkay) {
    responseMessage = `We do not reconginze the name ${name}.`;
  } else {
    responseMessage = `The name ${name} is a recongized name.`;
  }

  fillResponse(request, response, responseMessage);
}

//////////////////////////////////////////////////////////////////////////////
// addName 
//////////////////////////////////////////////////////////////////////////////

function addName(request, response) {
  let name = request.parameters.name;
  if (name === undefined || name == null) {
    console.error('webhook::addName - missing name');
    return;
  }

  let responseMessage;

  let nameIsKnow = nameManager.isNameValid(name);
  if (nameIsKnow) {
    responseMessage = `The name ${name} is already in the name list`;
  } else {
    let password = request.parameters.password;
    if (password === undefined || password == null) {
      console.error('webhook::addName - missing password');
      return;
    }

    if (password !== systemPassword) {
      let message = "You must provide the correct password to add a name.";
      fillResponse(request, response, message);
      return;      return;
    }

    console.log(`addName: ${name}`);

    nameManager.addName(name);

    responseMessage = `Name added: ${name}`;
  }

  fillResponse(request, response, responseMessage);
}

//////////////////////////////////////////////////////////////////////////////
// onRecordSuggestion 
//////////////////////////////////////////////////////////////////////////////

function onRecordSuggestion(request, response) {
  // console.log("onRecordSuggestion");
  
  let suggestionType = request.parameters.type;
  if (suggestionType === undefined || suggestionType == null) {
    console.log('webhook::onRecordSuggestion - not type');
    return;
  }

  let suggestion = request.parameters.type;
  if (suggestion === undefined || suggestion == null) {
    console.error('webhook::onRecordSuggestion - missing suggestion');
    let message = `Try: My suggestion is ...`;
    fillResponse(request, response, message);    
    return;
  }

  recordSuggestion(request.sessionId, suggestionType, suggestion);
  
  let message = `Thank you for your suggestion. Happy Holidays!`;
  fillResponse(request, response, message);    
}

function recordSuggestion(sessionId, type, suggestion) {
  const data = `${sessionId}:${type}:${suggesion}\n`;
  fs.appendFile('./suggestions.txt', data,
    (err) => {
      if (err) {
        console.error(`Unable to log suggestion: ${data}`)
      }
      console.log(`recorded suggestion: ${data}`);
    });
}

//////////////////////////////////////////////////////////////////////////////
// map actions to functions
//////////////////////////////////////////////////////////////////////////////

// Create handlers for Dialogflow actions as well as a 'default' handler
const actionHandlers = {
  'cheer': cheer,
  'set.element.color': onSetElementColor,
  'set.element.colors': onSetElementColors,
  'set.element.color.rgb': onSetElementColorByRgb,
  'set.channel.data': onSetChannelData,
  'command': onCommand,
  'record.suggestion': onRecordSuggestion,
  'get.random.fact' : getRandomFact,

  'add.message': addMessage,
  'check.name': checkName,
  'add.name': addName,

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
function processV2Request(request, response) {
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
    sessionData.lastUsedTimestamp = new Date();

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
  const sessionData = getSessionData(request.sessionId);
  let now = new Date();
  console.log(`${sessionData.sequence}: ${formattedResponse.fulfillmentText}${getTimestamp(now)}`);
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
// keep trees and elves "active"
//////////////////////////////////////////////////////////////////////////////

let counter = 0;

// The maximum and minium are inclusive
function getRandomIntegerInclusive(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;  
}

function idleCheck()
{
  const now = new Date();

  const elvesComponents = elements.elves.components;

  // modify all or none of the elves - it just looks cool
  let modifyElves = true;
  for (let elfComponent of elvesComponents) {
    const elementName = elfComponent.name;
    const elfQueue = getQueueForElement(elementName);
    let elasped = (now.getTime() - elfQueue.lastUsedTimestamp);
    if (elasped < maxElfIdleTime) {
      modifyElves = false;
      break;
    }
  }
  if (modifyElves) {
    let commandName = 'blink';
    switch (counter%4) {
      case 0:
        commandName = 'blink';
        break;
      case 1:
        commandName = 'sleep';
        break;
      case 2:
        commandName = 'flash';
        break;
      case 3:
        commandName = 'smile';
        break;
    }
    for (let elfComponent of elvesComponents) {
      const elementName = elfComponent.name;
      applyCommand("idle", commandName, elementName);
      enqueueRequestPlaceholder("idle", elementName);
      console.log(`-: ${commandName} ${elementName} ${getTimestamp(now)}`);
    }
    counter++;
  }

  const treeQueue = getQueueForElement("tree");
  let elasped = (now.getTime() - treeQueue.lastUsedTimestamp);
  if (elasped > maxTreesIdleTime) {
    let colorOrTeam = getRandomIntegerInclusive(1, 2)
    // console.log(`onIdle - colorOrTeam=${colorOrTeam}`);
    switch(colorOrTeam) {
      case 1:
        const colorIndex = getRandomIntegerInclusive(1, idleColors.length-1);
        const colorName = idleColors[colorIndex];
        setElementColor("idle", colorName, "trees");
        enqueueRequestPlaceholder("idle", "trees");
        console.log(`-: setElementColor ${colorIndex}/${colorName} trees ${getTimestamp(now)}`);
        break;
      case 2:
        const teamIndex = getRandomIntegerInclusive(1, idleTeams.length-1);
        const teamName = idleTeams[teamIndex];
        setElementToTeamColors("idle", teamName, "trees");
        enqueueRequestPlaceholder("idle", "trees");
      console.log(`-: setElementToTeamColors ${teamIndex}/${teamName} trees ${getTimestamp(now)}`);
        break;
    }
  }

  setTimeout(idleCheck, ideCheckTimeout);
}

setTimeout(idleCheck, ideCheckTimeout);
