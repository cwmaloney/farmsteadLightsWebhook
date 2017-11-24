'use strict';

// https://developers.google.com/actions/reference/nodejs/DialogflowApp
// note that the package "actions-on-google" has two intefaces. One for
// api.ai an another for "actions".
const { DialogflowApp } = require('actions-on-google');

const express = require('express');
const bodyParser = require('body-parser');

// const firebaseFunctions = require('firebase-functions');

// const { sprintf } = require('sprintf-js');

// this app's configuration data
//  categories, facts, messages, etc.
const configData = require('./config.js');

// TODO - what is this?
process.env.DEBUG = 'actions-on-google:*';

//////////////////////////////////////////////////////////////////////////////
// functions to support fact requests
//////////////////////////////////////////////////////////////////////////////

// create an array that contains the indexes of each element of another array
function createArrayOfIndexes(anArray) {
  const indexes = [];
  for (let index = 0; index < anArray; index++) {
    indexes = index;
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

  const index = Math.floor(Math.random() * array.length);
  const fact = anArray[index];

  // Delete the element
  anArray.splice(index, 1);
  return fact;
}

// get an unused fact
// This also stores the list of unused facts for the category in the app data
// api.ai maintains app.data as "session data"
function getUnusedFacts(app, category) {
  const sessionData = app.data;

  if (!sessionData.unusedFacts) {
    sessionData.unusedFacts = {};
  }

  if (!sessionData.unusedFacts[category.name]) {
      // Initialize category with list of unread facts
    sessionData.unusedFacts[category.name] = createArrayOfIndexes(category.facts);
  }
 
  return sessionData.unusedFacts[category.name];
};

// does this session have any unfinished categories?
function hasUnusedFacts(app, categoryName) {
  const sessionData = app.data;

  if (!sessionData.unusedFacts) {
    sessionData.unusedFacts = {};
  }

  if (!sessionData.unusedFacts.categoryName) {
    return true;
  }

  return sessionData.unusedFacts.categoryName.length > 0;
};

// returns the names of unfinished categories
function getUnfinishedCategories(app) {
  const unfinishedCategories = [];
  for (category in configData.categories) {
    const categoryName = catgory.name;
    if (hasUnusedFacts(app, categoryName)) {
      unfinishedCategories.push(catgoryName);
    }
  }
  return unfinishedCategories;
}

function getRandomFact(app) {
  const screenOutput = app.hasSurfaceCapability(app.SurfaceCapabilities.SCREEN_OUTPUT);
  const intent = app.getIntent();

  // lookup category
  const categoryName = app.getArgument("category");
  if (!categoryName || categoryName == null) {
    console.error('category name is missing');
    sendSuggestions();
  }
  const category = getCategory(categoryName);
  if (!category || category == null) {
    console.error(`${categoryName} category is unrecognized`);
    sendSuggetions;
  }

  // get a fact
  const unusedFactsForCategory = getUnusedFacts(app, categoryName);
  const fact = extractRandomElement(unusedFactsForCategory);
  if (!fact) {
    sendSuggestions(app, category);
  }
  sendFact(app, category, fact);
}

function sendFact(app, category, fact) {
  const factPrefix = category.factPrefix;
  if (!screenOutput) {
    return app.ask(concat([factPrefix, fact, strings.general.nextFact]), strings.general.noInputs);
  }

  let factText = null;
  let imageUrl = null;
  let imageName = null;
  let link = null;
  
  if (typeof fact === "String") {
    factText = fact;
  } else {
    factText = fact.fact;
    image = fact.image;
    link = fact.link;
  }
  const image = fact.image;
  const [url, name] = image;
  const card = app.buildBasicCard(factText)
    .addButton(strings.general.linkOut, strings.content.link)
    .setImage(url, name);

  if (fact.link) {
    card.addButton("Learn more", fact.link);
  }

  const richResponse = app.buildRichResponse()
    .addSimpleResponse(factPrefix)
    .addBasicCard(card)
    .addSimpleResponse(`Would you like to hear another fact about ${category.name}?`)
    .addSuggestions(["Sure", "No thanks"]);

  app.ask(richResponse, configData.noInputPrompt);
};

function sendSuggestions(app) {
  const unfinishedCategories = getUnfinishedCategotories();
  if (unfinishedCategories.length == 0) {
    app.tell("Looks like you've heard all my random facts!");
  }
  
  const richResponse = app.buildRichResponse()
    .addSimpleResponse("You have heard everything I know about %s. I could tell you about something else.")
    .addSuggestions(unfinishedCategories);

  return app.ask(richResponse, strings.general.noInputs);
}

//////////////////////////////////////////////////////////////////////////////
// functions to support show control requests
//////////////////////////////////////////////////////////////////////////////

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

function setShowElementColor(elementName, propertyName, propertyValue) {
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

// These are for Firebase deployment

// const actionMap = new Map();
// actionMap.set('deeplink.unknown', unhandledDeepLinks);
// actionMap.set('get.randomFact', getRandomFact);
// actionMap.set('set.element.color', setShowElementColor);
// actionMap.set('show.element', setShowElementProperty);
// actionMap.set('hide.element', hidShowElementProperty);
// actionMap.set('run.show', show);
// actionMap.set('stop.show', show);

// const myApi = firebaseFunctions.https.onRequest((request, response) => {
//   const app = new DialogflowApp({ request, response });
//   console.log(`Request headers: ${JSON.stringify(request.headers)}`);
//   console.log(`Request body: ${JSON.stringify(request.body)}`);
//   app.handleRequest(actionMap);
// });

// module.exports = {
//   myApi
// };

const server = express();

server.use(bodyParser.urlencoded( { extended: true} ) );

server.use(bodyParser.json());

server.post('/echo', function(req, res) {
    var speech = req.body.result &&
      req.body.result.parameters &&
      req.body.result.parameters.echoText ? req.body.result.parameters.echoText
                                          : "Please send a message you want echoed."
    return res.json({
        speech: speech,
        displayText: speech,
        source: 'webhook-echo-sample'
    });
});

const port = process.env.PORT || 8000;

server.listen(port, function() {
  console.log("Server starting; listening on port " + port);
});
