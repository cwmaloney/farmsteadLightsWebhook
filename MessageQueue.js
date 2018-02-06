"use strict";

const fs = require('fs');
const http = require("http");

const messageQueueFileName = 'messageQueue.json';
const messageDuration = 20000;
const maxMessagesPerSession = 3;

const defaultMessageDuration = 1000;
const defaultMessage = "Happy Valentine's Day - go to farmsteadLights.com to display your Valentine here";

const madrixServerAddress = "server";

class MessageQueue {

  constructor() {
    this.nextId = 1;
    this.map = new Map();
    this.showingDefaultMessage = false;
  }

  static getNowTimestampObject() {
    const nowDate = new Date();
    const nowTimestampObject = { year: nowDate.getFullYear(), month: nowDate.getMonth()+1, day: nowDate.getDate(),
                                  hour: nowDate.getHours(), minute: nowDate.getMinutes()};
    return nowTimestampObject;
  }

  static getNowTimestampNumber() {
    const timestampObject = MessageQueue.getNowTimestampObject();
    const timestampString = MessageQueue.getTimestampStringFromObject(timestampObject);
    const timestampNumber = MessageQueue.getTimestampNumber(timestampString);
    return timestampNumber;            
  }

  static parseDateAndTime(date, time) {
    // get now - use it for defaults
    const nowTimestampObject = MessageQueue.getNowTimestampObject();;

    let parsed = Object.assign(nowTimestampObject);

    if (date) {
      // const parsedDate = new Date(temp);
      // parsed.year = parsedDate.getYear();
      // parsed.month = parsedDate.getMonth();
      // parsed.day = parsedDate.getDay();

      let temp = date;
      const indexOfT = temp.indexOf('T');
      if (indexOfT){
        temp = temp.substr(0, indexOfT);
      }    
      const dateParts = temp.split('-');
      if (dateParts.length > 3) {
        throw `invalid date ${date}`;
      } else if (dateParts.length == 3) {
        parsed.year = Number.parseInt(dateParts[0]);
        parsed.month = Number.parseInt(dateParts[1]);
        parsed.day = Number.parseInt(dateParts[2]);
      } else if (dateParts.length == 2) {
        parsed.month = Number.parseInt(dateParts[0]);
        parsed.day = Number.parseInt(dateParts[1]);
      } else if (dateParts.length == 1) {
        parsed.day = Number.parseInt(dateParts[0]);
      }
      if (parsed.year > nowTimestampObject.year) {
        throw `Invalid date ${date} - Year must be ${now.year}`;
      }
      if (parsed.month != 2) {
        throw `Invalid date ${date} - Month must be February`;
      }
      if (parsed.day < 1 || parsed.day > 28) {
        throw `Invalid date ${date} - Day must be between 1 and 28`;       
      }
    }

    if (time) {
      // const parsedTime = new Date(time);
      // parsed.hour = parseTime.getHours();
      // parsed.minute = parseMinut.getMinutes();
 
      let temp = time;
      const indexOfT = temp.indexOf('T');
      if (indexOfT){
        temp = temp.substr(indexOfT+1);
      }
      const indexOfDash = temp.indexOf('-');
      if (indexOfDash){
        temp = temp.substr(0, indexOfDash);
      }    
 
      const timeParts = temp.split(':');
      if (timeParts.length > 3) {
        throw `Invalid time ${time}`;
      } else if (timeParts.length == 3 || timeParts.length == 2) {
        parsed.hour = Number.parseInt(timeParts[0]);
        parsed.minute = Number.parseInt(timeParts[1]);
        // ignore seconds
      } else if (timeParts.length == 1) {
        parsed.hour = Number.parseInt(timeParts[0]);
        parsed.minute = 0;
      }
      if (parsed.hour < 0 || parsed.hour > 23) {
        throw `Invalid time ${time} - Hour must be between 0 and 23`;
      }
      if (parsed.minute < 0 || parsed.minute > 59) {
        throw `Invalid time ${time} - Minute must be between 0 and 59`;
      }
    }

    // adjust time to PM
    if (nowTimestampObject.year === parsed.now
        && nowTimestampObject.year === parsed.month
        && nowTimestampObject.day === parsed.day
        && nowTimestampObject.hour >= parsed.hour
        && parsed.hour < 12) {
      parsed.hour += 12;
    }

    return parsed;
  }

  
  static getTimestampString(year, month, day, hour, minute) {
    return year.toString().padStart(4,0)
            + month.toString().padStart(2,0)
            + day.toString().padStart(2,0)
            + hour.toString().padStart(2,0)
            + minute.toString().padStart(2,0);
  }

  static getTimestampStringFromObject(timestampObject) {
    const timestampString = MessageQueue.getTimestampString(
      timestampObject.year, timestampObject.month, timestampObject.day,
      timestampObject.hour, timestampObject.minute);
    return timestampString;
  }

  static getTimestampNumber(timeString) {
    return new Number(timeString);
  }

  addMessage(sessionId, message, date, time) {
    const nowTimestampNumber = MessageQueue.getNowTimestampNumber();

    const timestampObject = MessageQueue.parseDateAndTime(date, time);
    const timestampString = MessageQueue.getTimestampStringFromObject(timestampObject);
    const timestampNumber = MessageQueue.getTimestampNumber(timestampString);

    if (timestampNumber < nowTimestampNumber) {
      throw `Requested message time is in the past`;
    }

    let timestampMapObject = this.map.get(timestampString);
    if (!timestampMapObject) {
      timestampMapObject = { timestampObject, timestampString, timestampNumber, messages: [] };
      this.map.set(timestampString, timestampMapObject);
    }
    const id = this.nextId++;

    console.log("addMessage:", sessionId, id, message, date, time);

    const messageObject = { sessionId, id, message, displayCount: 0 };
    timestampMapObject.messages.push(messageObject);
    this.writeMessages();

    this.displayNextMessage();

    return messageObject;
  }

  loadMessages(fileName) {
    if (!fileName) {
      fileName = messageQueueFileName;
    }
    if (fs.existsSync(fileName)) {
      console.log(`loading messages from ${fileName}...`);

      try {
        const temp = JSON.parse(fs.readFileSync(fileName, 'utf8'));
        this.nextId = temp.nextId;
        this.map = new Map(temp.map);
      } catch (error) {
        if (error.code !== "ENOENT") {
          throw error;
        }
      }

      console.log(`loading messages complete nextId=${this.nextId} size=${this.map.size}`);
    }
  }

  writeMessages(fileName) {
    if (!fileName) {
      fileName = messageQueueFileName;
    }
    //console.log(`writing messages to ${fileName} nextId=${this.nextId} size=${this.map.size} ...`);

    const temp = { nextId: this.nextId, map: [...this.map] };

    fs.writeFileSync(fileName, JSON.stringify(temp, null, '\t'), 'utf8');

    //console.log(`writing messages complete`);
  }

  // note that the message are put into the array as they arrive
  // so they are also extacted from the array in that order
  getNextMessage() {
    const currentTimestampNumber = MessageQueue.getNowTimestampNumber();
    for (const timestampNumber of this.map.keys()) {
      if (timestampNumber > currentTimestampNumber) {
        break;
      }
      const timestampObject = this.map.get(timestampNumber);
      for (let index = 0; index < timestampObject.messages.length; index++) {
        let messageObject = timestampObject.messages[index];
        if (messageObject.displayCount === undefined || messageObject.displayCount < 1) {      
          return messageObject;
        }
      }
    }
    return null;
  }

  checkOverUse(sessionId) {
    let message = null;

    const count = getMessageCountForSession(sessionId);   
    if (count >= maxMessagesPerSession) {
      message = `You have two many message in the queue.  Try again after your messages have been displayed.`;
    }
  
    return message;
  }
    
  getMessageCountForSession(sessionId) {
    let count = 0;
    for (const timestampNumber of this.map.keys()) {
      for (let index = 0; index < timestampObject.messages.length; index++) {
        const messageObject = timestampObject.messages[index];
        if (messageObject.displayCount === undefined || messageObject.displayCount < 0) {
          if (messageObject.sessionId === sessionId) {
            count++;
          } 
        }
      }
    }
    return count;
  }

  // getActiveMessages() {
  //   const activeMessages = [];
  //   const currentTimestampNumber = MessageQueue.getNowTimestampNumber();
  //   for (const timestampNumber of map.keys()) {
  //     if (timestampNumber > currentTimestampNumber) {
  //       break;
  //     }
  //     const messageObject = map.get(timestampNumber);
  //     if (messageObject.displayCount >= maximumDisplayCount) {
  //    
  //     } else {
  //       activeMessages.push(messageObject);
  //     }
  //   }
  //   return activeMessages;
  // }

  findMessageById(messageId) {
    for (const timestampNumber of map.keys()) {
     const messageObject = map.get(timestampNumber);
      if (messageObject.id == messageId) {}
        return messageObject;
    }
    return null;
  }

  // incrementMessageDisplayCount(messageId) {
  //   const messageObject = findMessageById(messageId);
  //   if (!messageObject) {
  //     console.log(`incrementMessageDisplayCount - missing message ${messageId}`);
  //     return;
  //   }

  //   messagesObject.displayCount += 1;

  //   writeMessages();
  // }
  
  displayNextMessage() {
    if (this.timerId === undefined || this.timerId === null) {
      let messageObject = this.getNextMessage();
      if (messageObject) {
        this.displayMessage(messageObject, messageObject.message);
        this.showingDefaultMessage = false;
        this.writeMessages();
        this.timerId = setTimeout(this.onTimeout.bind(this), messageDuration);
      } else {
        if (!this.showingDefaultMessage) {
          this.displayMessage(null, defaultMessage);
          this.showingDefaultMessage = true;
        }
        this.timerId = setTimeout(this.onTimeout.bind(this), defaultMessageDuration);
      }
    }
  }
  
  onTimeout(ignore) {
    this.timerId = null;
    this.displayNextMessage();
  }

  displayMessage(messageObject, message) {
    // http://10.0.0.100/gui_05/index.html?SetTextTicker=this+is+a+testset+own+tickertext+here
    console.log(`displayMessage: "${message}"`);
    const uriEncodedMessage = encodeURIComponent(message);

    function onResponse(response) {  
      const statusCode = response.statusCode;
      if (statusCode == 200) {
        if (messageObject != null && messageObject !== undefined) {
          messageObject.displayCount += 1;
          this.writeMessages();
        }
      }
      else {
        console.error(`displayMessage: response status code: ${statusCode}`);
        return;
      }
    }


    const url = `http://10.0.0.100/gui_05/index.html?SetTextTicker=${uriEncodedMessage}`;
    http.get(url, onResponse)
      .on('error',
        function(error) {
          console.error(`displayMessage: error: ${error.message}`);
        }
      );
  }
}

module.exports = { MessageQueue };


function getFutureTime(minutes) {
  let temp = new Date();
  temp = new Date(temp.getTime() + minutes*60*1000);
  const result = temp.getFullYear().toString().padStart(4,0)
                + '-' + (temp.getMonth() + 1).toString().padStart(2,0)
                + '-' + (temp.getDate()).toString().padStart(2,0)
                + 'T' + (temp.getHours()).toString().padStart(2,0)
                + ':' + (temp.getMinutes()).toString().padStart(2,0)
                + ':' + (temp.getSeconds()).toString().padStart(2,0)
                + '-0600';
  return result;
}

function test() {
  const queue = new MessageQueue();

  // queue.loadMessages("noFile");

  // queue.addMessage('1', "Amy, I love you, Sheldon");
  // queue.addMessage('2', "Cinnamon, I love you, Raj", null, "15:01");
  // queue.addMessage('1', "Penny, Will you be my Valentine?, Leonard", null, "15:01");
  // queue.addMessage('3', "Bernadette, Will you marry me? Howard", "2-14", "20:00");

  // queue.writeMessages("testMessageQueue.json");
  // queue.loadMessages("testMessageQueue.json");
  // queue.writeMessages("testMessageQueue.json");

  queue.displayNextMessage();

  const soon = getFutureTime(2);
  queue.addMessage('1', "Sue, I love you, Billy.  ");
  queue.addMessage('2', "Bernadette, Will you be my Valentine? Howard.  ", null, soon);
  queue.addMessage('3', "Sally, Will you marry me? Harry.  ", null, soon);

  function addMore() {
    queue.addMessage('1', "Amy, I love you, Sheldon.  ");
    const soon = getFutureTime(2);
    queue.addMessage('2', "Cinnamon, Will you be my Valentine? Raj  ", null, soon);
    queue.addMessage('1', "Penny, Will you be my Valentine? Leonard.  ", null, soon);
    queue.addMessage('3', "Luci, Will you marry me? Desi.  ", "2018-02-14T19:07:00-0600", "2018-02-14T19:07:00-0600");
  }
  setTimeout(addMore, 15000);
}


// test();



  // addMessageToFile(message, date, time) {
  //   const fs = require('fs');
  //
  //   const messageLine = message + ";" + date + ";" + time;
  //
  //   fs.appendFileSync(messageQueueFileName, );
  // }

  //
  // see http://2ality.com/2015/08/es6-map-json.html
  //
  // static mapToJson(map) {
  //   return JSON.stringify([...map]);
  // }
  // static jsonToMap(jsonStr) {
  //     return new Map(JSON.parse(jsonStr));
  // }
