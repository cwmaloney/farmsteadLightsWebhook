"use strict";

const fs = require('fs');

const { FileUtilities } = require("./FileUtilities.js");

const censusNamesFileName = 'censusNames.txt';
const additionalNamesFileName = 'additionalNames.txt';

class NameManager {

  constructor() {
    this.censusNames = new Map();
    this.additionalNames = new Map();
  }

  isNameValid(name) {
    return (this.additionalNames.get(name) !== undefined)
            || (this.censusNames.get(name) !== undefined);
  }

  addName(name) {
    if (this.isNameValid(name) === false) {
      this.additionalNames.set(name, this.additionalNames.size);
      this.writeAdditionalNames();
    }
  }

  loadNameLists() {
    this.censusNames = NameManager.loadNames(censusNamesFileName);
    this.additionalNames = NameManager.loadNames(additionalNamesFileName);
  }

  static loadNames(fileName) {
    console.log(`loading names from ${fileName}...`);

    const nameMap = new Map();
    function addNameToMap(line, index) {
      nameMap.set(line, index);
    }

    try {
      FileUtilities.forEachLineInFile(fileName, addNameToMap);
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }

    console.log(`loading names complete size=${nameMap.size}`);

    return nameMap;
  }

  writeAdditionalNames(fileName) {
    if (!fileName) {
      fileName = additionalNamesFileName;
    }
    console.log(`writing additional names to ${fileName} size=${this.additionalNames.size} ...`);
  
    let fd = fs.openSync(fileName, 'w');
    
    function writeName(value, key, map) {
      fs.writeSync(fd, key + '\n');
    }

    this.additionalNames.forEach(writeName);

    fs.closeSync(fd);
  
    console.log(`writing additional names complete`);
  }

}

module.exports = { NameManager };

// function test() {

//   const nameManager = new NameManager();

//   console.log(`loading names ${new Date()} ...`);
//   nameManager.loadNameLists();
//   console.log(`loading names complete ${new Date()}`);

//   function checkName(name) {
//     const isValid = nameManager.isNameValid(name)
//     console.log(`${name} isValid=${isValid}`);
//   }
//   checkName("Chris");
//   checkName("Mark");
//   checkName("bad");
//   checkName("Mom");
//   checkName("Grand Ma");
// }

// test();
