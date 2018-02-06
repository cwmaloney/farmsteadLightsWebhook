"use strict";

const http = require('http');
const https = require('https');

class HttpUtilities {

  static get(url, timeoutInMilliseconds) {
    // return new promise
    return new Promise((resolve, reject) => {
      // select http or https module, depending on reqested url
      const lib = url.startsWith('https') ? https : http;
      const request = lib.get(url, (response) => {
        // handle http errors
        if (response.statusCode < 200 || response.statusCode > 299) {
           reject(new Error('Status code: ' + response.statusCode));
         }
        // temporary data holder
        const body = [];
        // on every content chunk, push it to the data array
        response.on('data', (chunk) => body.push(chunk));
        // we are done, resolve promise with those joined chunks
        response.on('end', () => resolve(body.join('')));
      });
      // handle connection errors of the request
      request.on('error', (error) => reject(error))
      if (timeoutInMilliseconds) {
        request.setTimeout(timeoutInMilliseconds, function onTimeout() {
          console.error("Request timeout. Aborting request.");
          request.abort();
        });
      }
    })
  };
  
}

module.exports = { HttpUtilities };

function test() {
  HttpUtilities.get('http://scooterlabs.com/echo?x=1&y=2', 1000)
  .then((html) => {
    console.log(html);
    return HttpUtilities.get('http://scooterlabs.com/echo?x=3&y=4', 1000);
  })
  .then((html) => { 
    console.log(html);
  })
  .catch((error) => console.error(error));
}

// test();
