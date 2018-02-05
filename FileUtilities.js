var fs = require('fs');

class FileUtilities {
  /*
   * Synchronously call onLine(line, lineIndex) on each line read from file descriptor fd.
   */
  static forEachLine (fd, onLine) {
    const bufferSize = 64 * 1024;
    const buffer = new Buffer(bufferSize);
    let leftOver = '';
    let lineIndex = 0;
    let bytesRead;

    while ((bytesRead = fs.readSync(fd, buffer, 0, bufferSize, null)) !== 0) {
      const lines = buffer.toString('utf8', 0 , bytesRead).split(/\r?\n/);
      lines[0] = leftOver+lines[0];       // add leftover string from previous read
      while (lines.length > 1) {          // process all but the last line
        onLine(lines.shift(), lineIndex);
        lineIndex++;
      }
      leftOver = lines.shift();           // save last line fragment (may be '')
    }
    if (leftOver) {                         // process any remaining line
      onLine(leftOver, lineIndex);
    }
  }

  static forEachLineInFile(fileName, onLine) {
    var fd = fs.openSync(fileName, 'r');
    FileUtilities.forEachLine(fd, onLine);
    fs.closeSync(fd);
  }

}

module.exports = { FileUtilities };


// function test() {
//   const nameMap = new Map();

//   function addNameToMap(line, index) {
//     nameMap.set(line, index);
//   }

//   console.log(`loading names ${new Date()} ...`);

//   FileUtilities.forEachLineInFile("censusNames.txt", addNameToMap);

//   console.log(`loading names complete ${new Date()}, size=${nameMap.size}.`);

//   console.log(`index of Chris in map = ${nameMap.get("Chris")}`);
//   console.log(`index of Mark in map = ${nameMap.get("Mark")}`);
// }

// test();
