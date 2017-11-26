"use strict";

const { ArtNet } = require("./ArtNet.js");

const testChannelData = [
  [  0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 ],
  [ 11,11,11,11,11,11,11,11,11,11,11 ],
  [ 22,22,22,22,22,22,22,22,22,22 ],
  [ 33,33,33,33,33,33,33,33 ],
  [ 44,44,44,44,44,44,44 ],
  [ 55,55,55,55,55,55 ],
  [ 66,66,66,66,66 ],
  [ 77,77,77,77 ],
  [ 88,88,88 ],
  [ 99,99 ],
  [ 100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
  [ 150, 0, 1, 2, 1, 2, 3, 1, 2, 3, 4 ],
  [ 200, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1 ],  
  [ 250,99,99,99,99,99,99,99,99,99,99 ]
];

const artnet = new ArtNet();

const universe = 1;
const configuration = { "universe": universe,
                        "address": "192.168.1.148",
                        "sourcePort": 6454,
                        "refreshInterval": 1000 };
artnet.configureUniverse(configuration);

let testIndex = -1;

function runNextTest() {
  if (++testIndex >= testChannelData.length) testIndex = 0;
  
  const channelData = testChannelData[testIndex];

  console.log("--- ArtNetTest::runNextText", "testIndex", testIndex, 'data: ',  channelData);
  artnet.setChannelData(universe, 1, channelData);
  artnet.send(universe);
}

runNextTest();

setInterval(runNextTest, 5000);
