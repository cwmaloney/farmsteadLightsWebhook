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

function getSessionData(request) {
  return sessionDataCache[request.session];
}

//////////////////////////////////////////////////////////////////////////////
// Setup the ArtNet interface
//////////////////////////////////////////////////////////////////////////////

const artnet = new ArtNet();
const universe = 0;
const configuration = { "universe": universe, "address": "10.0.0.18" };
artnet.configureUniverse(configuration);

//////////////////////////////////////////////////////////////////////////////
// DMX mapping
//////////////////////////////////////////////////////////////////////////////

const elementNameToChannelMap = {
  tree: 1,
  poles: 32,
  fence: 48,
  elf: 64
};

const elementCountMap = {
  tree: 10
};

const teamNameToColorsMap = {
  huskies: [ 'purple', 'black', 'purple', 'white', 'purple', 'purple', 'white', 'purple', 'black', 'purple' ],
  chiefs: [ 'red', 'red', 'yellow', 'red', 'red', 'red', 'red', 'yellow', 'red', 'red'],
  royals: [ 'blue', 'blue', 'blue', 'blue', 'blue', 'blue', 'blue', 'blue', 'blue', 'blue'],
  sporting: [ 'sportingBlue', 'darkIndigo', 'sportingBlue', 'darkIndigo',
    'sportingBlue', 'darkIndigo', 'sportingBlue', 'darkIndigo', 'sportingBlue', 'darkIndigo'],
  snow: [ 'snow', 'snow', 'snow', 'snow', 'snow', 'snow', 'snow', 'snow', 'snow', 'snow'],
  santa: [ 'red', 'white', 'red', 'white', 'red', 'white', 'red', 'white', 'red', 'white'],
  usa: [ 'red', 'red', 'white', 'white', 'blue', 'blue', 'white', 'white', 'red', 'red' ],
  rainbow: [ 'red', 'orangeRed', 'orange', 'yellow', 'lime',
             'green', 'blue', 'darkIndigo', 'violet', 'darkViolet'],
  jayhawks: [ 'blue', 'blue', 'red', 'red', 'blue', 'blue', 'red', 'red', 'blue', 'blue' ],
  wildcats: [ 'royalPurple', 'royalPurple', 'royalPurple', 'royalPurple', 'royalPurple',
              'royalPurple', 'royalPurple', 'royalPurple', 'royalPurple', 'royalPurple' ],
  tigers: [ 'gold', 'gold', 'black', 'black', 'gold', 'gold', 'black', 'black', 'gold', 'gold'],
  hawks: [ 'royalBlue', 'royalBlue', 'royalBlue', 'royalBlue', 'royalBlue',
            'royalBlue', 'royalBlue', 'royalBlue', 'royalBlue', 'royalBlue']
};

const colorNameToChannelDataMap = {
  off:  [ 0, 0, 0 ],
  black: [ 0, 0, 0 ],
  red: [ 255, 0, 0 ],
  darkRed: [139, 0, 0],
  orangeRed: [255, 69, 0],
  green:[ 0, 128, 0 ],
  darkGreen: [ 0, 100, 0 ],
  blue: [ 0, 0, 255 ],
  darkBlue: [ 0, 0, 139],
  royalBlue: [ 65, 105, 225],
  navy: [0, 0, 128],
  white: [ 255, 255, 255 ],
  yellow: [ 255, 255, 0 ],
  pink: [ 255, 102, 178 ],
  purple: [ 102, 0, 102 ],
  royalPurple: [ 102, 51, 153 ],
  orange: [ 255, 128, 0 ],
  sportingBlue: [ 147, 177, 215 ],
  indigo: [ 75, 0, 130 ],
  darkIndigo: [ 0, 42, 92],
  violet: [ 238, 130, 238],
  darkViolet: [148, 0, 211],
  magenta: [ 255, 0, 255],
  cyan: [ 0, 255, 255],
  brown: [ 165, 42, 42],
  gold: [ 255, 215, 0],
  silver: [ 192, 192, 192],
  teal: [ 0, 128, 128],
  lime: [0, 255, 255],
  snow: [ 255, 250, 250 ]
};

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

function sendSuggestions(request, response, categoryName) {
  const unfinishedCategories = getUnfinishedCategotories(request);
  if (unfinishedCategories.length == 0) {
    fillResponse("Looks like you've heard all my random facts!");
  }
  
  if (categoryName) {
    fillResponse(
      `You have heard everything I know about ${categoryName}`);
    }
    else {
      fillResponse(
        `I'm confused.`);
        
    }
}

//////////////////////////////////////////////////////////////////////////////
// functions to support show change requests
//////////////////////////////////////////////////////////////////////////////

function setElementColor(request, response) {
  const elementName = request.parameters.elementName;
  if (elementName === undefined || elementName == null) {
    console.error('webhook::setElementColor - missing elementName');
    fillResponse(request, response,
      `Oh - I am tired. I forget the element name. Please try again later`);
    return;
  }  
  const elementChannelNumber = elementNameToChannelMap[elementName];
  if (elementChannelNumber === undefined || elementChannelNumber === null) {
    fillResponse(request, response,
      `I don't have ${elementName}. Sorry!`);
    return;
  }

  let elementNumber = request.parameters.elementNumber;
  if (elementNumber === undefined || elementNumber == null) {
    elementNumber = 1;
  }
  const elementCount = elementCountMap[elementName];
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
    fillResponse(request, response,
      `Oh - I am tired. I forget the color name. Please try again later`);
    return;
  }
  const colorChannelData = colorNameToChannelDataMap[colorName];
  if (colorChannelData === undefined) {
    fillResponse(request, response,
      `I don't know color ${colorName}. Sorry!`);
    return;
  }

  artnet.setChannelData(universe, elementChannelNumber + 3*(elementNumber - 1), colorChannelData);
  artnet.send(universe);

  let message = (!elementNumber)
    ? `Changing the color of ${elementName} to ${colorName}. Happy Holidays!`
    : `Changing the color of ${elementName} ${elementNumber} to ${colorName}. Happy Holidays!`;

  fillResponse(request, response, message);    
}

function cheer(request, response) {
  let teamName = request.parameters.teamName;
  if (teamName === undefined || teamName == null) {
    console.error('webhook::cheer - missing teamName');
    fillResponse(request, response,
      `Oh - I am tired forget the team name. Please try again later`);
    return;
  }
  teamName = teamName.toLowerCase();
  
  const colorNames = teamNameToColorsMap[teamName];
  if (!colorNames || colorNames == null) {
    fillResponse(request, response,
      `I don't have ${teamName}. Sorry!`);
    return;
  }
  for (let index = 0; index < colorNames.length; index++) {
    const colorName = colorNames[index];
    const colorChannelData = colorNameToChannelDataMap[colorName];
    if (colorChannelData === undefined) {
      fillResponse(request, response,
        `I don't know color ${colorName}. Sorry!`);
      return;
    }
    artnet.setChannelData(universe, elementNameToChannelMap.tree + (3*index), colorChannelData);
  }
  artnet.send(universe);

  fillResponse(request, response, `Go ${teamName}! Watch the trees cheer with you!`);
}

function showElement(elementName) {
  const showElementName = app.getArgument("showElement");
  if (!showElementName || showElementName == null) {
    console.error('element name is missing');
    sendUnregonizedInput();
  }
  app.tell(`Here comes ${elementName}.`);
}

function hideElement(elementName) {
  const showElementName = app.getArgument("showElement");
  if (!showElementName || showElementName == null) {
    console.error('element name is missing');
    sendUnregonizedInput();
  }
  app.tell(`Okay, ${elementName} is going to hide now.`);  
}

function runShow(elementName, showName) {
  const elementName = app.getArgument("element");
  if (!elementName || elementName == null) {
    console.error('element name is missing');
    sendUnregonizedInput();
  }
  const colorName = app.getArgument("color");
  if (!colorName || colorName == null) {
    console.error('color name is missing');
    sendUnregonizedInput();
  }

  app.tell(`Okay, chaning the color of ${elementName} to ${colorName}.`);    
}

function stopShow(elementName, showName) {
  const elementName = app.getArgument("element");
  if (!elementName || elementName == null) {
    console.error('element name is missing');
    sendUnregonizedInput();
  }
  const colorName = app.getArgument("color");
  if (!colorName || colorName == null) {
    console.error('color name is missing');
    sendUnregonizedInput();
  }

  app.tell(`Okay, chaning the color of ${elementName} to ${colorName}.`);    
}

//////////////////////////////////////////////////////////////////////////////
// map requests to functions
//////////////////////////////////////////////////////////////////////////////

// Create handlers for Dialogflow actions as well as a 'default' handler
const actionHandlers = {
  'cheer': cheer,

  'set.element.color': setElementColor,

  'get.random.fact' : getRandomFact,

  'check.webhook.status': (request, response) => {
    fillResponse(request, response, '* The Farmstead Light\'s webhook server is running!');
  },

  // The default welcome intent has been matched, so welcome the user
  // (https://dialogflow.com/docs/events#default_welcome_intent)
  'input.welcome': (request, response) => {
    fillResponse(request, response, '* Welcome to my Farmstead Lights agent!');
  },

  // The default fallback intent has been matched - no matching intent found.
  //  try to recover (https://dialogflow.com/docs/intents#fallback_intents)
  'input.unknown': (request, response) => {
    fillResponse(request, response, '* I\'m having trouble, can you try that again?');
  },

  // Default handler for unknown or undefined actions
  'default': (request, response) => {
    fillResponse(request, response,
      '* I am unable to help you now - Sorry.  Please try again later.');
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
    if (!session || session == null) {
      session = "pseudoSession-" + ++sessionCounter;
    }

    // create sessionData if needed
    let sessionData = getSessionData(session);
    if (sessionData === undefined) {
      sessionData = { sequence: sessionCounter++, creationTimestamp: new Date() };
      sessionDataCache[session] = sessionData;
    }

    if (sessionDataCache.size > maxSessionCount) {
      // delete oldest session
      let toDelete = undefined;
      sessionDataCache.forEach((value, key) =>
        { if (value.sequence < oldest) toDelete = key; } );
      if (toDelete) {
        sessionDataCache.delte(toDelete);
      }
    }

    // Run the proper handler function to handle the request from Dialogflow
    actionHandlers[action]({ action, parameters, contexts, source, session }, response);
  } catch (error) {
    console.error("processing Dialogflow error=", error);
    fillResponse(request, response, "Oh! I am not feeling well. I have a bad web hook.");
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
  console.log('webhook fillResponse: ', formattedResponse);
}

//////////////////////////////////////////////////////////////////////////////
// Configure and start the HTTP (webhook) server
//////////////////////////////////////////////////////////////////////////////

const server = express();

server.use(bodyParser.urlencoded( { extended: true } ) );

server.use(bodyParser.json());

server.post('/webhook', function(request, response) {
  try {
    console.log('webhook post', 'body', request.body);

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



///////////////////////////////////////////////////////////////////////////////
// ... junk... for version 1 ????
///////////////////////////////////////////////////////////////////////////////


// // Create handlers for Dialogflow actions as well as a 'default' handler
// const actionHandlers = {
//   'check': () => {
//     const message = 'Hello, This is the webhook. I seem to be functioning withing nomal paramters!';

//     // Use the Actions on Google lib to respond to Google requests; for other requests use JSON
//    if (requestSource === googleAssistantRequest) {
//      sendGoogleResponse(message);
//    } else {
//      fillResponse(message);
//    }
//  },
//  // The default fallback intent has been matched, try to recover (https://dialogflow.com/docs/intents#fallback_intents)
//  'input.unknown': () => {
//    const message = 'I\'m having trouble, can you try that again?';

//    // Use the Actions on Google lib to respond to Google requests; for other requests use JSON
//    if (requestSource === googleAssistantRequest) {
//      sendGoogleResponse(message);
//    } else {
//      fillResponse(message);
//    }
//  },
//  // Default handler for unknown or undefined actions
//  'default': () => {
//    // Use the Actions on Google lib to respond to Google requests; for other requests use JSON
//    if (requestSource === googleAssistantRequest) {
//      const message = 'I\'m having trouble.  Please try again later.';
//      let responsePackage = {
//        speech: message, // spoken response
//        text: message // displayed response
//      };
//      sendGoogleResponse(responsePackage);
//    } else {
//      let responsePackage = {
//        speech: message, // spoken response
//        text: message // displayed response
//      };
//      fillResponse(responsePackage);
//    }
//  }
// };


// // Function to send Google Assistant response to Dialogflow.
// // Dialogflow will forward the response to the user
// function sendGoogleResponse (responsePackage) {
//   if (typeof responsePackage === 'string') {
//     app.ask(responsePackage);
//   } else {
//     // If speech or displayText is defined use it to respond
//     let googleResponse = app.buildRichResponse().addSimpleResponse({
//       speech: responsePackage.speech || responsePackage.displayText,
//       displayText: responsePackage.displayText || responsePackage.speech
//     });
//     // Optional: Overwrite previous response with rich response
//     if (responsePackage.googleRichResponse) {
//       googleResponse = responsePackage.googleRichResponse;
//     }
//     // Optional: add contexts (https://dialogflow.com/docs/contexts)
//     if (responsePackage.googleOutputContexts) {
//       app.setContext(...responsePackage.googleOutputContexts);
//     }
//     console.log('Response to Dialogflow for Google Assistant: ' + JSON.stringify(googleResponse));
//     app.ask(googleResponse); // Send response to Dialogflow and Google Assistant
//   }
// }

// // Function to send simple (non Google Assistant) response to Dialogflow.
// // Dialogflow will forward the response to the user
// function fillResponse (responsePackage) {
//   // if the response is a string send it as a response to the user
//   if (typeof responsePackage === 'string') {
//     let responseJson = {};
//     responseJson.speech = responsePackage; // spoken response
//     responseJson.displayText = responsePackage; // displayed response
//     response.json(responseJson); // Send response to Dialogflow
//   } else {
//     // If the response to the user includes rich responses or contexts send them to Dialogflow
//     let responseJson = {};
//     // If speech or displayText is defined, use it to respond (if one isn't defined use the other's value)
//     responseJson.speech = responsePackage.speech || responsePackage.displayText;
//     responseJson.displayText = responsePackage.displayText || responsePackage.speech;
//     // Optional: add rich messages for integrations (https://dialogflow.com/docs/rich-messages)
//     responseJson.data = responsePackage.data;
//     // Optional: add contexts (https://dialogflow.com/docs/contexts)
//     responseJson.contextOut = responsePackage.outputContexts;
//     console.log('Response to Dialogflow: ' + JSON.stringify(responseJson));
//     response.json(responseJson); // Send response to Dialogflow
//   }
// }

// these will be to support "Google actions"

// function sendFact(request, response, category, fact) {
//   const factPrefix = category.factPrefix;
//   // if (!screenOutput) {
//   //   return app.ask(concat([factPrefix, fact, strings.general.nextFact]), strings.general.noInputs);
//   // }

//   let factText = null;
//   let imageUrl = null;
//   let imageName = null;
//   let link = null;
  
//   if (typeof fact === "String") {
//     factText = fact;
//   } else {
//     factText = fact.fact;
//     image = fact.image;
//     link = fact.link;
//   }
//   const image = fact.image;
//   const [url, name] = image;
//   const card = app.buildBasicCard(factText)
//     .addButton(strings.general.linkOut, strings.content.link)
//     .setImage(url, name);

//   if (fact.link) {
//     card.addButton("Learn more", fact.link);
//   }

//   const richResponse = app.buildRichResponse()
//     .addSimpleResponse(factPrefix)
//     .addBasicCard(card)
//     .addSimpleResponse(`Would you like to hear another fact about ${category.name}?`)
//     .addSuggestions(["Sure", "No thanks"]);

//   app.ask(richResponse, configData.noInputPrompt);
// };

// function sendSuggestions(app) {
//   const unfinishedCategories = getUnfinishedCategotories();
//   if (unfinishedCategories.length == 0) {
//     fillResponse("Looks like you've heard all my random facts!");
//   }
  
//   const richResponse = app.buildRichResponse()
//     .addSimpleResponse("You have heard everything I know about %s. I could tell you about something else.")
//     .addSuggestions(unfinishedCategories);

//   return app.ask(richResponse, strings.general.noInputs);
// }
