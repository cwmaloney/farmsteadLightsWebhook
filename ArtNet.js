/*
 * This is a simple library to interact with devices that support ArtNet from node.js.
 * Tested with node.js 8.4
 * 
 * Art-Net™ is a trademark of Artistic Licence Holdings Ltd.
 * spec: http://www.artisticlicence.com/WebSiteMaster/User%20Guides/art-net.pdf
 */

 // node.js modules
const dgram = require('dgram');
//const util = require('util');
const EventEmitter = require('events');

// TODO: should this emit events or only use callbacks? error, sent...
class ArtNet extends EventEmitter {
  constructor () {
    super();
    this.universeInfos = [];
  }

  getUniverseInfo(universe) {
    const universeInfo = this.universeInfos[universe];
    if (!universeInfo) {
      throw new Error("ArtNet::getUniverseInfo - universe " + universe + " has not been configured!");
    }
    return universeInfo;
  }

  configureUniverse(configuration) {

    console.log("ArtNet::configureUniverse", "configuraiton", configuration);
    
    const { universe = 1,
            address = '10.0.0.0',
            enableBroadcast = false,
            port = 0x1936,
            sendOnlyChangeData = true,
            minMessageInterval = 25, /* milliseconds */
            refreshInterval = 4000 /* milliseconds */} = configuration;

    //universe = this.checkUniverse(universe);

    this.universeInfos[universe] = {};

    const universeInfo = this.getUniverseInfo(universe);

    universeInfo.universe = universe;

    universeInfo.address = address;
    universeInfo.enableBroadcast = !!enableBroadcast;
    universeInfo.port = port;

    universeInfo.sendOnlyChangeData = !!sendOnlyChangeData;

    // see spec page 48; milliseconds
    universeInfo.minMessageInterval = minMessageInterval;

    // see spec page 51; in milliseconds
    universeInfo.refreshInterval = refreshInterval;

    universeInfo.channelData = new Uint8Array(512);
    universeInfo.channelData.fill(0);
    
    // The highest channel number that has changed
    universeInfo.changedChannelThreshold = undefined;
    
    // The refreshIntervalTimerId
    universeInfo.refreshIntervalTimerId = undefined;

    // The throttleTimerIds
    universeInfo.throttleTimerId = undefined;

    // true if channel data should be sent after throttle timeout
    universeInfo.sendDelayedByThrottle = false;

    // create a socket
    universeInfo.socket = dgram.createSocket({type: 'udp4', reuseAddr: true});

    // enable broacast after socket is ready
    if (universeInfo.enableBroadcast) {
      universeInfo.socket.on('listening', function() {
        console.log("ArtNet::configureUniverse setting broadcast for ", universe);
        socket.setBroadcast(true);
      });
    }

    universeInfo.socket.on('error', function () {
      console.log("*** ArtNet::socket error, universe=", universe);
    });

    universeInfo.socket.on('close', function () {
      console.log("ArtNet::socket closed, universe=", universe);
    });

    console.log("ArtNet::configureUniverse complete", "universeInfo:", universeInfo);
  }

  checkUniverse(universe = 0) {
    universe = parseInt(universe, 10);
    if (universe < 0 || universe > 32767) {
      throw new RangeError("ArtNet::Invalid universe " + universe);
    }
    return universe;
  }

  checkChannel(channel = 1) {
    channel = parseInt(channel, 10);
    if (channel < 1 || channel > 512) {
      throw new RangeError("ArtNet::Invalid channel "+ channel);
    }
    return channel;
  }

  checkChannelData(value = 0) {
    value = parseInt(value, 10);
    if (value < 0 || value > 255) {
      throw new RangeError("ArtNet::Invalid channel data "+ value);
    }
    return value;
  }

  /*
   * see spec page 45 for definition of ArtDmx message
   * 
   * The message makes a copy of the channel data so that
   * the data can be changed while the message is being sent.
   */
  createArtDmxMessage(universe, dataLength) {
    const universeInfo = this.getUniverseInfo(universe);

    const universeHighByte = (universe >> 8) & 0xff;
    const universeLowByte = universe & 0xff;

    // see spec page 48 - lenght must be even
    if (dataLength % 2) {
      dataLength += 1;
    }
    const dataLengthHighByte = (dataLength >> 8) & 0xff;
    const dataLengthLowByte = (dataLength & 0xff);

    const artDmxHeader = [
      65, 114, 116, 45, 78, 101, 116, 0,  // Art-Net 0
      0, 0x50, // Opcode: OpOutput / OpDmx (low byte first)
      0, 14, // protocol version 14 (hight byte first)
      0, 0,  // sequence and physical origin
      universeLowByte, universeHighByte, // (low byte first)
      dataLengthHighByte, dataLengthLowByte // (high byte first)
    ];

    const messageLength = artDmxHeader.length + dataLength;
    const message = new Uint8Array(messageLength);
    message.set(artDmxHeader);
    message.set(universeInfo.channelData.slice(0,dataLength), artDmxHeader.length);

    return message;
  }

  setOneChannelData(universe, channel, channelData) {
    universe = this.checkUniverse(universe);
    channel = this.checkChannel(channel);
    channelData = this.checkChannelData(channelData);

    const universeInfo = this.getUniverseInfo(universe);

    if (!universeInfo.channelData) {
      this.createChannelData(universe);
    }
    
    if (!universeInfo.changedChannelThreshold || channel > universeInfo.changedChannelThreshold) {
      universeInfo.changedChannelThreshold = channel;
    }

    universeInfo.channelData[channel-1] = channelData;
  }

  /*
   * data can be an array
   */
  setChannelData(universe, channel, data) {
    universe = this.checkUniverse(universe);
    channel = this.checkChannel(channel);

    if ((Array.isArray(data)) && (data.length > 0)) {
      for (let index = 0; index < data.length; index++) {
        this.setOneChannelData(universe, channel+index, data[index]);
      }
    } else {
      this.setOneChannelData(universe, channel, data);
    }
  }

  close() {
    for (let universe = 0; universe < universeInfos.length; universe++) {
      closeUniverse(universe);
    }
    universeInfos = [];
  }

  closeUniverse(universe) {
       const universeInfo = getUniverseInfo(universe);

      this.clearInterval(universeInfo.refreshInternvalTimerId);
      this.clearTimeout(universeInfo.throttleTimerId);
      universeInfo.socket.close();

    universeInfos[universe] = undefined;
  }

  onRefreshTimeout(universe) {
    console.log("ArtNet::onRefreshTimeout, universe="+universe);
    const universeInfo = this.getUniverseInfo(universe);

    universeInfo.changedChannelThreshold = universeInfo.channelData.length;
    this.send(universe);
  }

  onThrottleTimeout(universe) {
    const universeInfo = this.getUniverseInfo(universe);

    universeInfo.thottleTimerId = null;
    if (universeInfo.sendDelayedByThrottle) {
      universeInfo.sendDelayedByThrottle = false;
      console.log("ArtNet::onThrottleTimeout - sending universe after throttle, universe=" + universe);
      this.send(universe);
    } else {
      console.log("ArtNet::onThrottleTimeout - starting refresh timer, universe=" + universe);
      universeInfo.refreshInternvalTimerId = setTimeout(
        this.onRefreshTimeout.bind(this, universe), universeInfo.refreshInterval);
    }
  }

  onAfterSend(universe) {
    console.log("ArtNet::onAfterSend - starting throttle timer, universe=" + universe);
    const universeInfo = this.getUniverseInfo(universe);

    universeInfo.thottleTimerId = setTimeout(
      this.onThrottleTimeout.bind(this, universe), universeInfo.minMessageInterval);
  }

  /*
   * callback is optional
   */
  send(universe) {
    const universeInfo = this.getUniverseInfo(universe);
    
        // if there is a throttle time, do not send messaage but
    // set flag so throttle timer will send the message
    if (universeInfo.thottleTimerId) {
      console.log("ArtNet::send throttled, universe=", universe);
      universeInfo.sendDelayedByThrottle = true;
      return;
    }

    clearTimeout(universeInfo.refreshInternvalTimerId);
    universeInfo.refreshInternvalTimerId = null;

    if (universeInfo.changedChannelThreshold) { 
      let message = this.createArtDmxMessage(universe, universeInfo.changedChannelThreshold);
      universeInfo.changedChannelThreshold = 0;
  
      console.log("ArtNet::send, universe=" + universe, "message:", message);
      universeInfo.socket.send(message, 0, message.length, universeInfo.port, universeInfo.address,
        this.onAfterSend.bind(this, universe), universeInfo.minMessageInterval);
    }
  }

}

exports.ArtNet = ArtNet;
