const {Point, Circle, Rectangle, QuadTree, NetworkWrapper, QueryResult, ConnectionManager} = require('electron-game-util');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const os = require('os');
const littleEndian = os.endianness() == 'LE'
let Player;
const Terrain = require("./Terrain.js");

function range(length, start = 0) {
  return [...Array(length).keys()].map(e=>e+start)
}

let list = new TrackList(SIDE,false);

class World extends NetworkWrapper(Object,list,["displayName", "time", "dayLength"]){
  constructor(opts){
    if (!Player) Player = require('./Player.js');
    let {id, displayName, level, time = 0, dayLength = 24000} = opts;
    super(opts);
    this.displayName = displayName;
    this.level = level;
    this.time = time;
    this.dayLength = dayLength;
    this.loadedChunks = new Map();

    this.collisionTree = new QuadTree(new Rectangle(0,0,10000,10000), 10, true);
    if (SIDE == ConnectionManager.SERVER) {
      this.terrain = new Terrain();
      this.playerAreas = new Map();
      this.loadingRegions = new Set();
      this.waitingPlayers = new Map();
    } else if (SIDE == ConnectionManager.CLIENT) {
      //console.log("Waiting on chunk-load-" + this.netID);
      this.processClientChunks = this.processClientChunks.bind(this);
      connection.server.on('chunk-load-' + this.netID, this.processClientChunks)
    }
  }

  getLights(){
    return Entity.getLightEmitters(this.netID);
  }

  load() {
    try{
      fs.mkdirSync(path.join(this.level.getSaveLocation(), 'regions', this.netID), {recursive: true});
    } catch(e) {
      console.log(e);
    }
  }

  processClientChunks(data) {
    //console.log(data);
    let packetData = new Uint8Array(data);
    //console.log(Array.prototype.map.call(packetData, e=>{let byte = e.toString(16); return byte.length > 1? byte : '0' + byte}).join(' '));
    let packetDataView = new DataView(packetData.buffer);
    let loadLength = packetDataView.getUint32(0, littleEndian);
    //console.log(`Load Length: ${loadLength}`);
    let pointer = 4;
    //console.log(`Pointer: ${pointer}`);
    for (let i = 0; i < loadLength; i ++) {
      let coords = [packetDataView.getInt32(pointer, littleEndian)%32, packetDataView.getInt32(pointer + 4, littleEndian)%32];
      //console.log(`Coordinates: ${coords[0]},${coords[1]}`);
      pointer += 8; // Coordinates;
      //console.log(`Pointer: ${pointer}`);

      let size = packetDataView.getUint32(pointer, littleEndian);
      //console.log(`Size: ${size}`);
      pointer += 4;
      //console.log(`Pointer: ${pointer}`);


      // pointer - 12 to include coordinates and size for decode. pointer + size to get all the data.
      let chunkData = new DataView(packetData.buffer, pointer - 12, size + 12);


      let chunk = Terrain.TileChunk.fromClientData(chunkData);
      chunk.render();
      this.loadedChunks.set(chunk.chunkCoord.join(','), chunk);

      pointer += size;
      //console.log(`End Loop Pointer: ${pointer}`);
    }
    let unloadLength = packetDataView.getUint32(pointer, littleEndian);
    pointer += 4;
    //console.log(`Unload Length: ${unloadLength}`);

    for (let i = 0; i < unloadLength * 8; i +=8) {
      let key = `${packetDataView.getInt32(pointer + i, littleEndian)},${packetDataView.getInt32(pointer + i + 4, littleEndian)}`;
      //console.log(`Key: ${key}`);
      this.loadedChunks.delete(key)
    }
    //let unloadData = packetData.slice(loadLength + 2, loadLength + unloadLength + 2);




  }

  // getInitPkt(){
  //   let pack = super.getInitPkt();
  //   pack.displayName = this.displayName;
  //   return pack;
  // }

  // getUpdatePkt(){
  //   let pack = super.getUpdatePkt();
  //   pack.displayName = this.displayName;
  //   return pack;
  // }

  // update(pack){
  //   super.update(pack);
  //   switch(SIDE){
  //     case ConnectionManager.CLIENT:
  //       this.displayName = pack.displayName;
  //       break;
  //   }
  // }

  update(pack) {
    super.update(pack);
    /*
      Things to keep track of:
      - The chunks that need to be sent to each player. (New chunks between what player has loaded and what the player has moved into.)
      - The chunks the player can unload. (The chunks the player has left.)
      - The chunks the server can unload. (The chunks that all players have left. (No player has entered them or remains in them.))
      - The chunks the server needs to load. (The chunks the players have entered that are not already loaded.)
      - The regions that need to be loaded. (Regions that are not already loaded but now have players in them.)
      - The regions that need to be unloaded. (Regions that are loaded but no longer have players in them.)
    */
    if (SIDE == ConnectionManager.SERVER) {
      this.time ++;
      if (this.time >= this.dayLength) {
        this.time = 0;
      }
      let toLoad = new Set();
      let inUnloadedRegion = new Map();
      let toUnload = new Set();
      let playerUnloads = new Map();
      let playerLoads = new Map();
      let neededRegions = new Set();
      let unneededRegions = new Set();
      let regionsToLoad = new Set();

      let playerIds = Player.list.getIds().filter(e=>{let p = Player.list.get(e); return p && p.worldID == this.netID && p.connected})
      for (let playerId of playerIds) {
        let player = Player.list.get(playerId);
        let corners = new Rectangle(Math.round(player.x / Terrain.TileState.tileSize / Terrain.TileChunk.worldDivision) * Terrain.TileState.tileSize * Terrain.TileChunk.worldDivision, Math.round(player.y / Terrain.TileState.tileSize / Terrain.TileChunk.worldDivision) * Terrain.TileState.tileSize * Terrain.TileChunk.worldDivision, 1000, 1000).corners
        corners = [corners[0].x, corners[0].y, corners[2].x, corners[2].y].map((e,i)=>Math.round/*[i>1?'ceil':'floor']*/(e / Terrain.TileState.tileSize / Terrain.TileChunk.worldDivision));
        if (this.playerAreas.has(playerId)) {
          let playerArea = this.playerAreas.get(playerId);
          // FIXED: Fix as corners returns points not numbers

          // let toLoadTB = playerArea[1] != corners[1]?[playerArea]:[0,0,0,0];
          /*
            Things to calculate:
            - Width of (un)load deltas. (width of loadArea)
            - Height of (un)load deltas. (y1 + h1 - y2)
            - Top corners of (un)load deltas.
            - (Min|Max)s of (un)load deltas.
          */
          //       -----------------x-----------------|------------------y-----------------|------------w-----------|------------h-----------|
          // let a = [Math.min(corners[0], playerArea[0]), Math.min(corners[1], playerArea[1]), corners[2] - corners[0], corners[3] - corners[1]]
          // let b = [Math.max(corners[0], playerArea[0]), Math.max(corners[1], playerArea[1]), corners[2] - corners[0], corners[3] - corners[1]]
          // /*
          //   hh┌────────────┐wv
          //     ├─┬──────────┼─┐
          //     │ │          │ │
          //     │ │          │ │ hv
          //     │ │          │ │
          //     └─┼──────────┴─┤
          //       └────────────┘
          //             wh
          // */
          // let wv = b[0] - a[0];
          // let hv = a[1] + a[3] - b[1];
          // let wh = a[2];
          // let hh = b[1] - a[1];
          // // 0: Vertical, 1: Horizontal
          // //                 |------------v-------------|-------------h------------|
          // //                 |-----x-----|--y--|-w-|-h-|`|--x-|------y-----|-w-|-h-|
          // let loadRects   = [[a[0] + a[2], b[1], wv, hv],[b[0], a[1] + a[3], wh, hh]];
          // let unloadRects = [[a[0]       , b[1], wv, hv],[a[0], a[1]       , wh, hh]];
          // loadRects = loadRects.map(e=>e[2] < 0 ? [e[0] - e[2], e[1], Math.abs(e[2]), e[3]]: e);
          // loadRects = loadRects.map(e=>e[3] < 0 ? [e[0], e[1] - e[2], e[2], Math.abs(e[3])]: e);
          // unloadRects = unloadRects.map(e=>e[2] < 0 ? [e[0] - e[2], e[1], Math.abs(e[2]), e[3]]: e);
          // unloadRects = unloadRects.map(e=>e[3] < 0 ? [e[0], e[1] - e[2], e[2], Math.abs(e[3])]: e);
          //
          // let playerLoad =  range(loadRects[0][2], loadRects[0][0])
          //                     .reduce((acc, e)=>acc.concat(range(loadRects[0][3], loadRects[0][1]).map(f=>[e, f])), [])
          //                     .concat(range(loadRects[1][2], loadRects[1][0])
          //                       .reduce((acc, e)=>acc.concat(range(loadRects[1][3], loadRects[1][1]).map(f=>[e, f])), [])
          //                     )
          // playerLoads.set(playerId,playerLoad);
          // playerUnloads.set(playerId, range(unloadRects[0][2], unloadRects[0][0])
          //                             .reduce((acc, e)=>acc.concat(range(unloadRects[0][3], unloadRects[0][1]).map(f=>[e, f])), [])
          //                             .concat(range(unloadRects[1][2], unloadRects[1][0])
          //                                     .reduce((acc, e)=>acc.concat(range(unloadRects[1][3], unloadRects[1][1]).map(f=>[e, f])), [])
          //                                    )
          //                  )

          //Basic system of scanning both areas and comparing each chunk.
          playerLoads.set(playerId, []);
          playerUnloads.set(playerId, []);
          for (let i of range(Math.abs(corners[2] - corners[0]), corners[0])) {
            for (let j of range(Math.abs(corners[3] - corners[1]), corners[1])) {
              if (i < playerArea[0]||i >= playerArea[2] || j < playerArea[1]||j >= playerArea[3]) {
                console.log(`(${i},${j}) => loading...`);
                playerLoads.get(playerId).push([i,j]);
              }
            }
          }

          for (let i of range(playerArea[2] - playerArea[0], playerArea[0])) {
            for (let j of range(playerArea[3] - playerArea[1], playerArea[1])) {
              if (i < corners[0]||i >= corners[2] || j < corners[1]||j >= corners[3]) {
                console.log(`(${i},${j}) => unloading...`);
                playerUnloads.get(playerId).push([i,j]);
              }
            }
          }

          // TODO: Add chunk data to loads.

          if (playerLoads.length > 0) console.log(playerLoads);



          // for (let x = corners[0]; x < corners[2]; x ++) {
          //   for (let y = corners[1]; y < corners[3]; y ++) {
          //     if (playerArea[0] < x && playerArea[2] > x && playerArea[1] < y && playerArea[3] > y) {
          //
          //     } else {
          //
          //     }
          //   }
          // }
          // corners = corners.map()
        } else {
          playerLoads.set(playerId, range(corners[2] - corners[0], corners[0]).reduce((acc, e)=>acc.concat(range(corners[3] - corners[1], corners[1]).map(f=>[e, f])), []))
          playerUnloads.set(playerId, []);
        }
        for (let i of range(playerLoads.get(playerId).length).reverse()) {
          let chunk = playerLoads.get(playerId)[i];
          let region = chunk.map(e=>Math.floor(e/32));
          let regionString = region.join(',');
          let chunkString = chunk.join(',');
          if (!(this.terrain.loadedRegions.has(region[0]) && this.terrain.loadedRegions.get(region[0]).has(region[1]))){
            //If in unloaded Region add the region to the regionToLoad list.
            if (!this.loadingRegions.has(regionString)) regionsToLoad.add(regionString);
            if (!inUnloadedRegion.has(regionString)) inUnloadedRegion.set(regionString, new Set())
            inUnloadedRegion.get(regionString).add(chunkString);
            if (!this.waitingPlayers.has(regionString)) this.waitingPlayers.set(regionString, new Map());
            if (!this.waitingPlayers.get(regionString).has(playerId)) this.waitingPlayers.get(regionString).set(playerId, []);
            this.waitingPlayers.get(regionString).get(playerId).push(chunk);
            playerLoads.get(playerId).splice(i, 1);
          } else {
            toLoad.add(chunkString);
          }
        }
        for (let unload of playerUnloads.get(playerId)) {
          let chunk = unload.join(',');
          if (!toLoad.has(chunk)){
            console.log(`Chunk not needed by another player. Unloading ${unload}`);
            toUnload.add(chunk);
          }
        }

        this.playerAreas.set(playerId, corners);

      }

      for (let playerId of this.playerAreas.keys()) {
        let player = Player.list.get(playerId);
        if (!player || player.worldID != this.netID) {
          let corners = this.playerAreas.get(playerId);
          // TODO: Make sure these chunks are unloaded on server side.
          let data = range(corners[2] - corners[0], corners[0]).reduce((acc, e)=>acc.concat(range(corners[3] - corners[1], corners[1]).map(f=>[e, f])), []);
          if (player && connection.connections[player.socketID]) {
            connection.connections[player.socketID].socket.binary(true).emit('chunk-load-'+this.netID, new Uint8Array([0, 0, 0, 0, ...new Uint8Array(new Uint32Array(data.length).buffer), ...new Uint8Array(new Int32Array(data.flat(2)).buffer)]).buffer);
          }
          this.playerAreas.delete(playerId);
          for (let chunk of data) toUnload.add(chunk.join(','));
        }
      }

      // TODO: Fix client communication not sending binary data.

      //Remove all chunks marked for unload currently in other players areas.
      for (let playerId of playerIds) {
        let player = Player.list.get(playerId);
        let playerArea = this.playerAreas.get(playerId);

        for (let chunkString of toUnload) {
          let [x, y] = chunkString.split(',');
          if (x >= playerArea[0] && x < playerArea[2] && y >= playerArea[1] && y < playerArea[3]) {
            toUnload.delete(chunkString);
          }
        }
      }

      //For all loading chunks check if they are in unloaded regions.
      for (let chunkString of toLoad) {

      }

      //Start loading the needed regions.
      for (let region of regionsToLoad) {
        this.loadingRegions.add(region);
        let regionCoords = region.split(',');
        let regionPath = path.join(this.level.getSaveLocation(),'regions', this.netID, `r.${regionCoords[0]}.${regionCoords[1]}.region`);
        fsp.readFile(regionPath).then(data=>{
          console.log("Reading file");
          this.terrain.loadRegion(...regionCoords, new DataView(Uint8Array.from(data).buffer));
          console.log("Done loading file");
        }).catch((e)=>{
          console.log(e);
          console.log("Couldn't find region file for region " + region + ". Generating one...");
          this.terrain.addRegion(new Terrain.TileRegion(...regionCoords));
          for (let chunk of inUnloadedRegion.get(region)) {
            //Add the loaded regions needed chunks to the loaded list.
            let coords = chunk.split(',');
            this.terrain.getChunk(...coords).generate(this.level.perlin, ...regionCoords);
          }
        }).finally(()=>{
          console.log("Loading done. Notifying players...");
          if (this.waitingPlayers.has(region)) {
            for (let [playerId, chunks] of this.waitingPlayers.get(region)) {
              let player = Player.list.get(playerId);
              // console.log("Player waiting on region " + region);
              // TODO: Optimise so only getting data once per chunk using inUnloadedRegion below..
              if (player && connection.connections[player.socketID]) {
                console.log(`Loading region ${region} with needed chunks (${chunks.join('), (')})`);
                console.log(this.terrain.getRegion(...regionCoords));
                let data = chunks.map((c)=>this.terrain.getChunk(...c).getClientData(...regionCoords));
                let flatData = data.reduce((acc, d)=>acc.concat(Array.from(d)), []);
                connection.connections[player.socketID].socket.binary(true).emit('chunk-load-'+this.netID, new Uint8Array([...new Uint8Array(new Uint32Array([data.length]).buffer), ...flatData, 0, 0, 0 ,0]))
              }
            }
          }
          for (let chunk of inUnloadedRegion.get(region)) {
            //Add the loaded regions needed chunks to the loaded list.
            this.loadedChunks.set(chunk, this.terrain.getChunk(...chunk.split(',')));
          }
          inUnloadedRegion.delete(region);
          this.waitingPlayers.delete(region);
          this.loadingRegions.delete(region);
        })
      }

      //Add the loading chunks to the loaded list.
      for (let chunk of toLoad) {
        this.loadedChunks.set(chunk , this.terrain.getChunk(...chunk.split(',')))
      }
      for (let playerId of playerIds) {
        let player = Player.list.get(playerId);
        if (player && (playerLoads.get(playerId).length > 0 || playerUnloads.get(playerId).length > 0) && connection.connections[player.socketID] ) {
          let data = {load: playerLoads.get(playerId).map(c=>{if (!this.terrain.getChunk(...c).populated) this.terrain.getChunk(...c).generate(this.level.perlin, ...c.map(e=>Math.floor(e/32))); return this.terrain.getChunk(...c).getClientData(...c.map(d=>Math.floor(d/32)))}), unload: playerUnloads.get(playerId)};
          connection.connections[player.socketID].socket.binary(true).emit('chunk-load-'+this.netID, new Uint8Array([...new Uint8Array(new Uint32Array([data.load.length]).buffer), ...data.load.reduce((acc, d)=>acc.concat(Array.from(d)), []), ...new Uint8Array(new Uint32Array([data.unload.length]).buffer), ... new Uint8Array(new Int32Array(data.unload.flat()).buffer)]));
        }
      }


      let regionLoaders = new Map();

      //for all unloading chunks check if they are the last chunk to be unloaded in their region.
      for (let [chunk, chunkObj] of this.loadedChunks) {
        let region = chunk.split(',').map(e=>Math.floor(e/32));
        let regionString = region.join(',');
        if (!regionLoaders.has(regionString)) regionLoaders.set(regionString, new Set());
        regionLoaders.get(regionString).add(chunk);
      }
      for (let chunk of toUnload) {
        //If they are save and unload the region.
        let region = chunk.split(',').map(e=>Math.floor(e/32));
        let regionString = region.join(',');
        console.log(`Unloading chunk ${chunk} in region ${regionString}`);
        if (regionLoaders.has(regionString) && regionLoaders.get(regionString).has(chunk)) {
          regionLoaders.get(regionString).delete(chunk);
          if (regionLoaders.get(regionString).size <= 0) {
            //Unload the region.
            console.log(`Unloading region ${regionString}`);
            let data = this.terrain.getRegionSaveData(...region);
            fsp.writeFile(path.join(this.level.getSaveLocation(),'regions', this.netID, `r.${region[0]}.${region[1]}.region`), data, {flag: 'w'}).then(()=>{
              this.terrain.unloadRegion(...region);
            });
          }
        }
        this.loadedChunks.delete(chunk);
      }

      // TODO: Add dirty updates to tiles.
      // Add client code to handle chunk loads and updates.

      //Tick all loaded chunks.
    }
  }
}

list.setType(World);

World.list = list;

module.exports = World;
