# Terrain Netowrking
The server takes advantage of binary transmission to communicte the state of the terrain to the clients.

## Packet Format
The packets are sent on an event 'chunk-load-\<world_id\>'. The payload follows a binary format as shown:

| Number of chunks to load | Chunks to Load | Number of chunks to unload | Chunk coordinates to unload |
| ------------------------ | -------------- | -------------------------------- | --------------------------- |

The chunks to load section is made up of the chuns in the same format as the region files.

| Chunk Coordinates | Size | Chunk Data |
| ------------------ | ---- | ---------- |
