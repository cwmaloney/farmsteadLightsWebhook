var fs = require('fs');

const messageQueueFileName = 'messageQueue.json';
  
class MessageQueue {

  constructor() {
    this.nextId = 1;
    this.map = new Map();
  }

  // getTimestamp(date, time) {
  //   const dateParts = date.split('-');
  //   if (dataParts != 3) {
  //     throw `invalid date ${date}`;
  //   }
  //   const timeParts = time.split(':');
  //   if (timeParts != 3) {
  //     throw `invalid time ${time}`;
  //   }
  //   return { year, month, day, hour, minute };
  // }

  static getCurrentTimestampNumber() {
    const nowDate = new Date();
    const timestamp = { year: nowDate.getFullYear(), month: nowDate.getMonth()+1, day: nowDate.getDate(),
                        hour: nowDate.getHours(), minute: nowDate.getMinutes() };
    const timestampString = MessageQueue.getTimestampString(
      timestamp.year, timestamp.month, timestamp.day,
      timestamp.hour, timestamp.minute);
    const timestampNumber = MessageQueue.getTimestampNumber(timestampString);
    return timestampNumber;            
  }

  static parseDateAndTime(date, time) {
    const nowDate = new Date();
    const now = { year: nowDate.getFullYear(), month: nowDate.getMonth()+1, day: nowDate.getDate(),
                  hour: nowDate.getHours(), minute: nowDate.getMinutes() };
    let parsed = Object.assign(now);

    if (date) {               
      const dateParts = date.split('-');
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
      if (parsed.year != now.year) {
        throw `Invalid date ${date} - Year must be ${now.year}`;
      }
      if (parsed.month != 2) {
        throw `Invalid date ${date} - Month must be February`;
      }
      if (parsed.day < 1 || parsed.day > 31) {
        throw `Invalid date ${date} - Day must be between 1 and 31`;       
      }
      // if (parsed.year < now.year) {
      //   throw `invalid date ${date} - Year is in the past`; 
      // }
      // if (parsed.month < now.month) {
      //   throw `invalid date ${date} - Month is in the past`; 
      // }
      if (parsed.day < now.day) {
        throw `Invalid date ${date} - Day is in the past`; 
      }
    }
    if (time) {
      const timeParts = time.split(':');
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
    if (now.year === parsed.now && now.year === parsed.now && now.year === parsed.now
        && now.hour >= parsed.hour && parsed.hour < 12) {
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

  static getTimestampNumber(timeString) {
    return new Number(timeString);
  }


  addMessage(message, date, time) {
    const timestamp = MessageQueue.parseDateAndTime(date, time);
    const timestampString = MessageQueue.getTimestampString(
        timestamp.year, timestamp.month, timestamp.day,
        timestamp.hour, timestamp.minute);
    const timestampNumber = MessageQueue.getTimestampNumber(timestampString);

    let timestampObject = this.map.get(timestampString);
    if (!timestampObject) {
      timestampObject = { timestamp, timestampString, timestampNumber, messages: [] };
      this.map.set(timestampString, timestampObject);
    }
    const messageObject = { id: this.nextId++, message };
    timestampObject.messages.push(messageObject);
    return messageObject;
  }

  // addMessageToFile(message, date, time) {
  //   const fs = require('fs');

  //   const messageLine = message + ";" + date + ";" + time;

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

  loadMessages(fileName) {
    if (!fileName) {
      fileName = messageQueueFileName;
    }
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

  writeMessages(fileName) {
    if (!fileName) {
      fileName = messageQueueFileName;
    }
    console.log(`writing messages to ${fileName} nextId=${this.nextId} size=${this.map.size} ...`);

    const temp = { nextId: this.nextId, map: [...this.map] };

    fs.writeFileSync(fileName, JSON.stringify(temp, null, '\t'), 'utf8');

    console.log(`writing messages complete`);
  }

  getActiveMessages() {
    const activeMessages = [];
    const currentTimestampNumber = MessageQueue.getCurrentTimestampNumber();
    for (const timestampNumber of map.keys()) {
      if (timestampNumber > currentTimestampNumber) {
        break;
      }
      const messageObject = map.get(timestampNumber);
      if (messageObject.displayCount >= maximumDisplayCount) {
      
      } else {
        activeMessages.push(messageObject);
      }
    }
    return activeMessages;
  }

  findMessageById(messageId) {
    for (const timestampNumber of map.keys()) {
     const messageObject = map.get(timestampNumber);
      if (messageObject.id == messageId) {}
        return messageObject;
    }
    return null;
  }

  incrementMessageDisplayCount(messageId) {
    const messageObject = findMessageById(messageId);
    if (!messageObject) {
      console.log(`incrementMessageDisplayCount - missing message ${messageId}`);
      return;
    }

    messagesObject.displayCount += 1;

    writeMessages();
  } 
}

function test() {
  const queue = new MessageQueue();

  queue.loadMessages("noFile");

  queue.addMessage("Amy, I love you, Sheldon");
  queue.addMessage("Cinnamon, I love you, Raj", null, "15:01");
  queue.addMessage("Penny, Will you be my Valentine?, Leonard", null, "15:01");
  queue.addMessage("Bernadette, Will you marry me? Howard", "2-14", "20:00");

  queue.writeMessages("testMessageQueue.json");
  queue.loadMessages("testMessageQueue.json");
  queue.writeMessages("testMessageQueue.json");
}

//test();
