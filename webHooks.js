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
//  categories, facts, messages, etc.
const {facts, welcomeMessage} = require('./config.js');

// TODO - what is this?
process.env.DEBUG = 'actions-on-google:*';

//////////////////////////////////////////////////////////////////////////////
// sessionDataCache is keyed by session id from Dialogflow
// The session data object is the value of the map.
// The session data object contains a sequence number and creation data. This
// library uses these trackthe age of the session.
const sessionDataCache = new Map();
const maxSessionCount = 100;
let sessionCounter = 0;

function getSessionData(session) {
  // console.log(`getSessionData: session=${session} data=${sessionDataCache[session]}`);

  let sessionData = sessionDataCache[session];
  if (sessionData === undefined) {
    sessionData = {};
    sessionDataCache[session] = sessionData;
  }

  return sessionData;
}

//////////////////////////////////////////////////////////////////////////////

const teamNameToColorsMap = {
  Chiefs: [ 'red', 'red', 'yellow', 'red', 'red', 'red', 'red', 'yellow', 'red', 'red'],
  Falcons: [ 'blue', 'gold', 'gold', 'gold', 'blue',
             'blue', 'gold', 'gold', 'gold', 'blue'],
  Gorillas: [ 'crimson', 'crimson', 'crimson', 'crimson', 'crimson',
              'gold', 'gold', 'gold', 'gold', 'gold'],
  Grinch: [ 'grinchGreen', 'grinchGreen', 'grinchGreen', 'grinchGreen', 'grinchGreen',
            'grinchGreen', 'grinchGreen', 'grinchGreen', 'grinchGreen', 'grinchGreen' ],
  Halloween: [ 'orange', 'orange', 'black', 'black', 'orange',
               'orange', 'black', 'black', 'orange', 'orange'],
  Hawks: [ 'royalBlue', 'royalBlue', 'royalBlue', 'royalBlue', 'royalBlue',
               'royalBlue', 'royalBlue', 'royalBlue', 'royalBlue', 'royalBlue'],
  Huskies: [ 'purple', 'black', 'purple', 'white', 'purple',
             'purple', 'white', 'purple', 'black', 'purple' ],
  Jayhawks: [ 'blue', 'blue', 'red', 'red', 'blue', 'blue', 'red', 'red', 'blue', 'blue' ],
  Mavericks: [ 'orange', 'orange', 'orange', 'orange', 'lightBlue',
               'lightBlue', 'orange', 'orange', 'orange', 'orange'],
  HornedFrogs: [ 'hornedFrogPurple', 'hornedFrogPurple', 'hornedFrogPurple',
                 'hornedFrogPurple', 'white', 'white', 'hornedFrogPurple',
                 'hornedFrogPurple', 'hornedFrogPurple', 'hornedFrogPurple' ],
  Kangaroos: [ 'blue', 'blue', 'gold', 'gold', 'blue',
               'blue', 'gold', 'gold', 'blue', 'blue'],
  Pioneers: [ 'blue', 'blue', 'blue', 'blue', 'fuchsia',
              'fuchsia', 'blue', 'blue', 'blue', 'blue',],
  Nebraska: [ 'red', 'red', 'red', 'red', 'red', 'red', 'red', 'red', 'red', 'red' ],
  Neptunes: [ 'darkBlue', 'darkBlue', 'white', 'white', 'darkBlue',
              'darkBlue', 'white', 'white', 'darkBlue', 'darkBlue' ],
  Rainbow: [ 'darkRed', 'red', 'orangeRed', 'orange', 'yellow',
             'chartreuse', 'green', 'blue', 'indigo', 'violet'],
  Reindeer: [ 'darkBrown', 'darkBrown', 'darkBrown', 'darkBrown', 'darkBrown',
              'darkBrown', 'darkBrown', 'darkBrown', 'red', 'black'],
  Royals: [ 'blue', 'blue', 'blue', 'blue', 'blue', 'blue', 'blue', 'blue', 'blue', 'blue'],
  Rudolph: [ 'darkBrown', 'darkBrown', 'darkBrown', 'darkBrown', 'darkBrown',
             'darkBrown', 'darkBrown', 'darkBrown', 'red', 'black'],
  Santa: [ 'red', 'white', 'red', 'white', 'red', 'white', 'red', 'white', 'red', 'white'],
  Sporting: [ 'sportingBlue', 'darkIndigo', 'sportingBlue', 'darkIndigo',
              'sportingBlue', 'darkIndigo', 'sportingBlue', 'darkIndigo', 'sportingBlue', 'darkIndigo'],
  Snow: [ 'snow', 'snow', 'snow', 'snow', 'snow', 'snow', 'snow', 'snow', 'snow', 'snow'],
  Tigers: [ 'gold', 'gold', 'black', 'black', 'gold',
            'gold', 'black', 'black', 'gold', 'gold'],
  USA: [ 'red', 'red', 'red', 'red', 'white', 'white', 'blue', 'blue', 'blue', 'blue' ],
  Wildcats: [ 'royalPurple', 'royalPurple', 'royalPurple', 'royalPurple', 'royalPurple',
              'royalPurple', 'royalPurple', 'royalPurple', 'royalPurple', 'royalPurple' ]
};

const colorNameToChannelDataMap = {
  on: [ 255, 255, 255 ],
  white: [ 255, 255, 255 ],
  snow: [ 225, 225, 225 ],
  celadon: [ 162, 215, 165 ],
  gray: [ 32, 32, 32 ],
  silver: [ 175, 175, 175 ],
  
  red: [ 255, 0, 0 ],
  crimson: [ 220, 20, 60 ],
  darkRed: [20, 0, 0],

  pink: [ 255, 102, 178 ],
  darkPink: [ 175, 75, 140 ],
  maroon: [ 128, 0, 0],
  fuchsia: [ 255, 0, 255 ],
  magenta: [ 255, 0, 255 ],
  
  orange: [ 255, 127, 0 ],
  orangeRed: [255, 69, 0],

  yellow: [ 255, 255, 0 ],

  brown: [ 32, 20, 11 ],
  darkBrown: [ 20, 13, 5 ],
  gold: [ 215, 185, 0 ],

  yellowGreen: [ 154, 205, 50 ],
  chartreuse: [ 63, 128, 0 ],

  green:[ 0, 255, 0 ],
  darkGreen: [ 0, 30, 0 ],
  grinchGreen: [ 40, 190, 0 ],
  olive: [ 45, 65, 0 ],
  turquoise: [ 64, 224, 204 ],
  darkTurquoise: [ 0, 206, 209 ],
  lime: [127, 255, 0],
  teal: [ 0, 128, 128],

  blueGreen: [ 13, 152, 186 ],
  cyan: [ 0, 250, 250],
  darkCyan: [ 0, 90, 90 ],
 
  blue: [ 0, 0, 255 ],
  lightBlue: [ 107, 164, 184 ],
  cornFlowerBlue: [ 70, 119, 207 ],
  darkBlue: [ 0, 0, 30],
  royalBlue: [ 65, 105, 225],
  navy: [0, 0, 25],
  midnightBlue: [ 25, 25, 112 ],
  sportingBlue: [ 147, 177, 215 ],
  
  indigo: [ 28, 0, 64 ],
  darkIndigo: [ 7, 0, 16 ],

  blueViolet: [ 138, 43, 226 ],
  
  purple: [ 75, 0, 128 ],
  royalPurple: [ 102, 51, 153 ],
  hornedFrogPurple: [ 77, 25, 121 ],

  violet: [ 139, 0, 255 ],
  darkViolet: [ 35, 0, 58 ],

  black: [ 0, 0, 0 ],
  off:  [ 0, 0, 0 ]
};

//////////////////////////////////////////////////////////////////////////////
// Commands that can be sent to elements
/////////////////////////////////////////////////////////////////////////////
    /* -----
    Elf parts
      1 - body/head/outline
      2 - eyes
      3 - unused - future
      4 - top mouth
      5 - middle mouth
      6 - bottom mouth
      7 - open mouth
      8 - ooh circle mouth
    ----- */

const commands = {
  flash: {
    elf : {
      directives: [
        { channelData: [ 255, 255, 0, 255, 255, 255, 255, 255 ], duration: 500 },
        { channelData: [ 0, 0, 0, 0, 0, 0, 0, 0 ], duration: 500 },
        { channelData: [ 255, 255, 0, 255, 255, 255, 255, 255 ], duration: 1000 },
        { channelData: [ 0, 0, 0, 0, 0, 0, 0, 0 ], duration: 1000 },
        { channelData: [ 255, 255, 0, 255, 255, 255, 255, 255 ], duration: 2000 },
        { channelData: [ 0, 0, 0, 0, 0, 0, 0, 0 ], duration: 2000 },
        { channelData: [ 255, 255, 0, 255, 255, 255, 255, 255 ], duration: 10000 }
      ]
    }
  },
  blink: {
    elf : {
      directives: [
        { channelData: [ 255, 255, 0, 0, 0, 0, 255, 0 ], duration: 250 },
        { channelData: [ 255,   0, 0, 0, 0, 0, 255, 0 ], duration: 250 },
        { channelData: [ 255, 255, 0, 0, 0, 0, 255, 0  ], duration: 500 },
        { channelData: [ 255,   0, 0, 0, 0, 0, 255, 0 ], duration: 500 },
        { channelData: [ 255, 255, 0, 0, 0, 0, 255, 0  ], duration: 1000 },
        { channelData: [ 255, 255, 0, 0, 0, 0, 255, 0  ], duration: 10000 }
      ]
    }
  },
  smile: {
    elf: {
      directives: [
        { channelData: [ 255, 255, 0,   0,   0,   0, 255,   0 ], duration: 1000 },
        { channelData: [ 255, 255, 0, 255,   0, 255,   0,   0 ], duration: 1000 },
        { channelData: [ 255, 255, 0,   0, 255, 255,   0,   0 ], duration: 1000 },
        { channelData: [ 255, 255, 0,   0,   0,   0, 255,   0 ], duration: 1000 },
        { channelData: [ 255, 255, 0,   0,   0,   0, 255, 255 ], duration: 2000 },
        { channelData: [ 255, 255, 0,   0,   0,   0, 255,   0 ], duration: 10000 }
      ]
    }
  }
};

//////////////////////////////////////////////////////////////////////////////
// DMX mapping
//////////////////////////////////////////////////////////////////////////////

const elements = {
  tree:    { elementType: "tree", queueName: "trees", count: 10, universe: 0, startChannel: 1, channelsPerElement: 3},
  buddy:   { elementType: "elf", queueName: "buddy", count: 1, universe: 1, startChannel: 113, channelsPerElement: 8 },
  kringle: { elementType: "elf", queueName: "kringle", count: 1, universe: 1, startChannel: 121, channelsPerElement: 8 },
  bliss:   { elementType: "elf", queueName: "bliss", count: 1, universe: 2, startChannel: 129, channelsPerElement: 8 },
  hermey:  { elementType: "elf", queueName: "hermey", count: 1, universe: 2, startChannel: 137, channelsPerElement: 8 }
};

const treeDirectiveDuration = 5000;

const universes = [
  { universe: 0, "address": "10.0.0.18" },
  { universe: 1, "address": "10.7.90.1" },
  { universe: 2, "address": "10.7.90.2" }
];

//////////////////////////////////////////////////////////////////////////////
// DirectiveQueue
//   Directives are channel updates with a duration.
//   The duration delays processiong of the nest message in the queue.
//////////////////////////////////////////////////////////////////////////////

function setChannelData(directive) {
  if (directive.universe >= 0) {
    console.log(`setChannelData: universe=${directive.universe} channel=${directive.channelNumber}
      data=${directive.channelData}`);
  }
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

// get catagory from configuration data
function getCatagory(categoryName) {
  for (let index = 0; index < configData.categories; index++) {
    const category = configData.categories[index];
    if (category.catgoryName == categoryNaem) {
      return category;
    }
  }
  return null;
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
  const sessionData = getSessionData(request);
  
  if (sessionData.unusedFacts === undefined) {
    sessionData.unusedFacts = {};
  }

  if (sessionData.unusedFacts[categoryName] === undefined) {
    // Initialize unusedFacts with list of all facts
    const category = facts[categoryName];
    sessionData.unusedFacts[categoryName] = createArrayOfIndexes(category.facts);
  }
 
  return sessionData.unusedFacts[categoryName];
}

// does this session have any unfinished categories?
function hasUnusedFacts(request, categoryName) {
  const sessionData = getSessionData(request);

  if (!sessionData.unusedFacts) {
    sessionData.unusedFacts = {};
  }

  if (!sessionData.unusedFacts.categoryName) {
    return true;
  }

  return sessionData.unusedFacts.categoryName.length > 0;
}

// returns the names of unfinished categories
function getUnfinishedCategories(request) {
  const unfinishedCategories = [];
  for (category in configData.categories) {
    const categoryName = catgory.name;
    if (hasUnusedFacts(request, categoryName)) {
      unfinishedCategories.push(catgoryName);
    }
  }
  return unfinishedCategories;
}

function getRandomFact(request, response) {
  // lookup category
  const categoryName = request.parameters.categoryName;
  if (categoryName == undefined || categoryName == null) {
    console.error('category name is missing');
    sendCategorySuggestions(request, response, categoryName);
  }
  const category = facts[categoryName];
  if (category == undefined|| category == null) {
    console.error(`${categoryName} category is unrecognized`);
    sendCategorySuggestions(request, response, categoryName);
  }

  // get a fact
  const unusedFactsForCategory = getUnusedFacts(request, categoryName);
  const element = extractRandomElement(unusedFactsForCategory);
  if (element == null || element == undefined) {
    sendCategorySuggestions(request, response, categoryName);
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
  const unfinishedCategories = getUnfinishedCategories(request);
  if (unfinishedCategories.length == 0) {
    fillResponse("Looks like you've heard all my random facts!");
  }
  
  if (categoryName) {
    fillResponse(
      `You have heard everything I know about ${categoryName}`);
    }
    else {
      fillResponse(`I'm confused.`);    
    }
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
  let message = `Setting colors of ${elementName} to ${colorMessage}. ${queueMessage} Happy Holidays!`;
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

  directive.elementName = elementName;
  directive.universe = elementInfo.universe;
  directive.channelNumber = elementInfo.startChannel;
  directive.channelData = channelData; 
  directive.duration = treeDirectiveDuration;
  
  const queueMessage = enqueueDirectives(directive);  
  
  // console.log(`setAllElementColorsByRgb: universe=${directive.universe} channel=${directive.channelNumber} data=${directive.channelData}`);
  let message = `Changing the ${elementName} to ${red}, ${green}, ${blue}. ${queueMessage} Happy Holidays!`;
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
  
  const elementCount = elementInfo.count;
  const elementType = elementInfo.elementType;
  
  const commandElementInfo = commandInfo[elementType.toLowerCase()];
  if (commandElementInfo === undefined || commandElementInfo === null) {
    console.error(`webhook::doCommand - there is no ${commandName} command for ${elementType}.`);
    return;
  }

  console.log(`doCommand, commandName=${commandName} elementName=${elementName} type=${elementType}`);  
  
  let prototypes = [] = commandElementInfo.directives;
  if (prototypes === undefined || prototypes === null) {
    console.error(`webhook::doCommand - there is no directives for ${commandName} command for ${elementName}.`);
    return;
  }  

  const directives = [];
  for (let index = 0; index < prototypes.length; index++) {
    const prototype = prototypes[index];

    const directive = {
      elementName: elementName,
      universe: elementInfo.universe,
      channelNumber: elementInfo.startChannel,
      channelData: prototype.channelData,
      duration: prototype.duration
    };
    directives.push(directive);

    console.log(`doCommand: ${JSON.stringify(directives)}`);
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
    const elementStartIndex = (elementInfo.channelsPerElement)*(colorIndex - 1);
    for (let rgbIndex = 0; rgbIndex < colorChannelData.length; rgbIndex++) {
      channelData[elementStartIndex + rgbIndex] = colorChannelData[rgbIndex];
    }
  }
  
  let directive = {};

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

  const values = request.parameters.values;
  if (values === undefined || values === null) {
    value = 255;
  }
  if (!Array.isArray(values)) {
    values = [ value ];
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
    let message = `The Farmstead Light's webhook server is running! queues=${JSON.stringify(directiveQueues)}`;
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
    let session = (request.body.session) ? request.body.session : undefined;

    // create a session id if needed
    if (session == undefined || session == null) {
      session = "pseudoSession-" + ++sessionCounter;
    }
    // console.log(`request: session=${session}`);

    // create sessionData if needed
    let sessionData = getSessionData(session);
    if (sessionData === undefined) {
      sessionData = { sequence: sessionCounter++, creationTimestamp: new Date() };
      sessionDataCache[session] = sessionData;
      // console.log(`creatingSessionData: session=${session}`)
    }

    if (sessionDataCache.length > maxSessionCount) {
      // delete oldest session
      let toDelete = undefined;
      sessionDataCache.forEach((value, key) =>
        { if (value.sequence < oldest) toDelete = key; } );
      if (toDelete) {
        console.log(`removing oldest sessionData: session=${toDelete}`)
        sessionDataCache.delete(toDelete);
      }
    }

    // Run the proper handler function to handle the request from Dialogflow
    actionHandlers[action]({ action, parameters, contexts, source, session }, response);
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
  console.log('webhook::fillResponse: ', formattedResponse);
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
