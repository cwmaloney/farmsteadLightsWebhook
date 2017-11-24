"use strict";

const { ArtNet } = require("./ArtNet.js");

const testChannelData = [
  [ 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [ 1 ],
  [ 2 ],
  [ 3 ],
  [ 4 ],
  [ 5 ],
  [ 6 ],
  [ 7 ],
  [ 8 ],
  [ 9 ],
  [ 10 ],
  [ 0, 0, 1, 2, 1, 2, 3, 1, 2, 3, 4],
  [ 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],  
  [ 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]
];

const artnet = new ArtNet();

const universe = 1;

const configuration = { universe, "ipAddress": "10.0.0.18" };

artnet.configureUniverse(configuration);

let testIndex = -1;

function runNextTest() {
  if (++testIndex >= testChannelData.length) testIndex = 0;
  
  const channelData = testChannelData[testIndex];

  console.log("ArtNetTest::runNextText", "testIndex", testIndex, 'data: ',  channelData);
  artnet.setChannelData(universe, 1, channelData);
  artnet.send(universe);
}

runNextTest();

setInterval(runNextTest, 8000);
