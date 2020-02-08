# Terrain Binary Format
The terrain system uses one very similar to [Minecraft](https://minecraft.net/)'s [Anvil format](https://minecraft.gamepedia.com/Region_file_format). It groups tiles into chunks and chunks into regions that are loaded to and from disk as players load different portions of the map. Each region represents a 32 x 32 set of chunks each representing a 16 x 16 set of tiles. Each tile holds the data for it's state and held materials in a format explained later in this document.

## File structure
```
[save folder]
└ regions
  ├ <world name>
  │ ├ r.<x>.<y>.region
  │ ├ r.<x>.<y>.region
  │ ├ ⋮
  │ └ r.<x>.<y>.region
  ├ <world name>
  │ ├ r.<x>.<y>.region
  │ ├ r.<x>.<y>.region
  │ ├ ⋮
  │ └ r.<x>.<y>.region
  ├ ⋮
  └ <world name>
    ├ r.<x>.<y>.region
    ├ r.<x>.<y>.region
    ├ ⋮
    └ r.<x>.<y>.region
```
Where:
- `[save folder]` is the folder with the name of the save that contains all of the save data.
- `<world name>` is the id of the various worlds registered in the game.
- `r.<x>.<y>.region` are the region files themselves.

The `.region` files are the binary files that store the data representing all of the tiles, chunks and regions within the save.
Each file is a different region whose 'region coordinates' are the `<x>.<y>` portion of the region file name. For example a region with coordinates (-1, 2) would be named `r.-1.2.region`.

## Region Binary Format
The region file is split into two major sections:

| Header | Payload |
| ------ | ------- |

The header section contains data describing the format of the payload section. The payload section contains the actual chunk data.

### Header Information
The header of region files consist of a single section. This section stores the byte offset from the beginning of the payload section in a 32 bit integer. Each location points to the starting byte of the chunk data. If an entry is 0 that means it is not generated yet and hence does not exist in the file as there is no data to store.

### Payload Structure
The payload section is made up of variable length blocks of data. These blocks have the following structure:

| Chunk Coordinates | Size | Chunk Data |
| ------------------ | ---- | ---------- |

The chunk coordinates are 2 bytes representing the region local coordinates of the chunk (0 - 31; inclusive). The size is a single 64 bit integer describing the size of the chunk data section. The chunk data contains the data of the various tiles that make up the chunk. Tiles without resources are not saved. Each tile has the following format:

| Tile Coordinates | Size | Resource Data |
| ---------------- | ---- | ------------- |

The tile coordinates are two 4 bit integers representing the chunk local x and y coordinates. The size portion is a 16 bit integer that indicates the number of different resource types stored in the tile. This varies per tile as some tiles may have no resources and others hundreds.  
The resource data is made up of repeating blocks of self descriptive data, representing the different resources in the tile, in the following format:

| Name Length | Resource Name | Amount |
| ----------- | ------------- | ------ |
| A 16 bit integer providing the length of the resource name in bytes. | A utf-8 string of the resource id. | A 32 bit float representing the amount of the resource in this tile |
