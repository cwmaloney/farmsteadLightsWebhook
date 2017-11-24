# ArtNet

### References

* [Art-Net protocol specification](http://www.artisticlicence.com/WebSiteMaster/User%20Guides/art-net.pdf)

# Methods

## configureUniverse(configuration)

Parameters:
Configuration
  * universe - the DMX universe; default is 1.
  * ipAddress -  The IP address for the universe; The default is'10.0.0.0'.
  * enableBroadcast - Use broadcast mode to send messages; The default is false.
  * port - IP port for the universe reciever; The default is0x1936.
  * sendOnlyChangeData - If true, always send the all values DMX. If false, send only changed values; Default is true.
  * minMessageInterval = Minimun interval between packets, in milliseconds - see spec page 48; The default 50.
  * refreshInterval = interval, in milliseconds, before sending a repeat packet - see spec page 51; The default 4000.

This method configures the library to send data for the universe and creates the UDP socket needed to send data for the universe.

## setChannelData( universe, channel, data )

Parameters:
* universe is the DMX universe.
* channel is the DMX channel.
* data is the channel data. It must be a value between 0 and 255, null, or undefined. If the data is null or undefined, the channel data is not changed.

After the data is sent, the library will call the the call back function.

## send(universe)
Parameters:
* universe is the DMX universe.

## close(universe)
Parameters:
* universe is the DMX universe.

Closes the UDP socket create for the universe.

## Example 1

```javascript
const { ArtNet } = require("./ArtNet.js");

const artnet = new ArtNet();

artnet.configureUniverse(1, { "ipAddress": "10.0.0.18" } );

artnet.setChannelData(universe, 0, [ 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
artnet.send(universe);

artnet.close(universe);

```
