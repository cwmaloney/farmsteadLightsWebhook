# ArtNet

### References

* [Art-Net protocol specification](http://www.artisticlicence.com/WebSiteMaster/User%20Guides/art-net.pdf)

# Notes

* Universe numbers used by this library are zero based.
Some ArtNet products (including Madrix) refer to this as universe 1.
* Channel numbers used by this library are one based
to be consistent with most other products.
The data for channel one is the first byte of channel data in a ArtDMX message.

# Methods

## configureUniverse(configuration)

### Parameters

  * configuration is an object that may have these properties:
    * universe - the DMX universe; default is 0.
    * address -  The IP address for the universe; The default is'10.0.0.0'.
    * enableBroadcast - Use broadcast mode to send messages; The default is false.
    * port - IP port for the universe reciever; The default is0x1936.
    * sourcePort - IP port the library should use to send messages. The default is to pick a random port.
    * sendSequenceNumbers - Send ArtNet sequence numbers - if false sends 0 - if true sends ArtNet sequence numbers 1-255 and wrapping around from 255 to 1 (per the ArtNet specification). The default is true.
    * sendOnlyChangeData - If true, always send the all values DMX. If false, send only changed values; Default is true.
    * minMessageInterval = Minimun interval between packets, in milliseconds - see spec page 48; The default 25 (40 frames a second).
    * refreshInterval = interval, in milliseconds, before sending a repeat packet - see spec page 51; The default 4000.

This method configures the library to send data for the universe and creates the UDP socket needed to send data for the universe.

## setChannelData( universe, channel, data )

### Parameters
* universe is the DMX universe.
* channel is the DMX channel.
* data is the channel data. It must be a value between 0 and 255, null, or undefined. If the data is null or undefined, the channel data is not changed.

After the data is sent, the library will call the the call back function.

## send(universe)
### Parameters
* universe is the DMX universe.

## closeUniverse(universe)
### Parameters
* universe is the DMX universe.

Closes the UDP socket create for the universe and delete the universe configuration.

## close()

Closes all sockets and deletes on configurations. 

# Example 1

```javascript
const { ArtNet } = require("./ArtNet.js");

const artnet = new ArtNet();

artnet.configureUniverse({ "universe": 1; "ipAddress": "10.0.0.1" } );

artnet.setChannelData(universe, 1, [ 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
artnet.send(universe);

artnet.close(universe);

```
