const {Point, Circle, Rectangle, QuadTree, NetworkWrapper, QueryResult, ConnectionManager} = require('electron-game-util');
const fsp = require('fs').promises;
const path = require('path');
let Player;
const Terrain = require("./Terrain.js");

function range(length, start = 0) {
  return [...Array(length).keys()].map(e=>e+start)
}

let list = new TrackList(SIDE,false);

class World extends NetworkWrapper(Object,list,["displayName"]){
  constructor(opts){
    if (!Player) Player = require('./Player.js');
    let {id, displayName, level} = opts;
    super(opts);
    this.displayName = displayName;
    this.level = level;
    if (SIDE == ConnectionManager.SERVER) this.collisionTree = new QuadTree(new Rectangle(0,0,10000,10000), 10, true);
    this.terrain = new Terrain();
    this.playerAreas = new Map();
    this.loadedChunks = new Set();
    this.loadingRegions = new Set();
    this.waitingPlayers = new Map();
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
      let toLoad = new Set();
      let inUnloadedRegion = new Map();
      let toUnload = new Set();
      let playerUnloads = new Map();
      let playerLoads = new Map();
      let neededRegions = new Set();
      let unneededRegions = new Set();
      let regionsToLoad = new Set();

      let playerIds = Player.list.getIds().filter(e=>Player.list.get(e).worldID == this.netID)
      for (let playerId of playerIds) {
        let player = Player.list.get(playerId);
        let corners = new Rectangle(player.x, player.y, 1000, 1000).corners
        corners = [corners[0].x, corners[0].y, corners[2].x, corners[2].y].map(e=>Math.floor(e / Terrain.TileState.tileSize / Terrain.TileChunk.worldDivision));
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
          let a = [Math.min(corners[0], playerArea[0]), Math.min(corners[1], playerArea[1]), corners[2] - corners[0], corners[3] - corners[1]]
          let b = [Math.max(corners[0], playerArea[0]), Math.max(corners[1], playerArea[1]), corners[2] - corners[0], corners[3] - corners[1]]
          /*
            hh┌────────────┐wv
              ├─┬──────────┼─┐
              │ │          │ │
              │ │          │ │ hv
              │ │          │ │
              └─┼──────────┴─┤
                └────────────┘
                      wh
          */
          let wv = b[0] - a[0];
          let hv = a[1] + a[3] - b[1];
          let wh = a[2];
          let hh = b[1] - a[1];
          // 0: Vertical, 1: Horizontal
          //                 |------------v-------------|-------------h------------|
          //                 |-----x-----|--y--|-w-|-h-|`|--x-|------y-----|-w-|-h-|
          let loadRects   = [[a[0] + a[2], b[1], wv, hv],[b[0], a[1] + a[3], wh, hh]];
          let unloadRects = [[a[0]       , b[1], wv, hv],[a[0], a[1]       , wh, hh]];
          let playerLoad =  range(loadRects[0][2], loadRects[0][0])
                              .reduce((acc, e)=>acc.concat(range(loadRects[0][3], loadRects[0][1]).map(f=>[e, f])), [])
                              .concat(range(loadRects[1][2], loadRects[1][0])
                                .reduce((acc, e)=>acc.concat(range(loadRects[1][3], loadRects[1][1]).map(f=>[e, f])), [])
                              )
          playerLoads.set(playerId,playerLoad);
          playerUnloads.set(playerId, range(unloadRects[0][2], unloadRects[0][0])
                                      .reduce((acc, e)=>acc.concat(range(unloadRects[0][3], unloadRects[0][1]).map(f=>[e, f])), [])
                                      .concat(range(unloadRects[1][2], unloadRects[1][0])
                                              .reduce((acc, e)=>acc.concat(range(unloadRects[1][3], unloadRects[1][1]).map(f=>[e, f])), [])
                                             )
                           )
          // TODO: Add chunk data to loads.



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
          if (!toLoad.has(chunk))
            toUnload.add(chunk);
        }

        this.playerAreas.set(playerId, corners);

      }

      for (let playerId of this.playerAreas.keys()) {
        let player = Player.list.get(playerId);
        if (player.worldID != this.netID) {
          let corners = this.playerAreas.get(playerId);
          // TODO: Make sure these chunks are unloaded on server side.
          if (connection.connections[player.socketID]) {
            let data = range(corners[2] - corners[0], corners[0]).reduce((acc, e)=>acc.concat(range(corners[3] - corners[1], corners[1]).map(f=>[e, f])), []);
            connection.connections[player.socketID].socket.emit('chunk-load', new Uint8Array([0, data.length, ...new Uint8Array(new Int32Array(data.flat()).buffer)]));
          }
          this.playerAreas.delete(playerId);
        }
      }

      // TODO: Fix client communication not sending binary data.

      //Remove all chunks marked for unload currently in other players areas.
      for (let playerId of playerIds) {
        let player = Player.list.get(playerId);
        let playerArea = this.playerAreas.get(playerId);

        for (let chunkString of toUnload) {
          let chunk = chunkString.split(',');
          if (chunk[0] < playerArea[0] || chunk[0] > playerArea[2] || chunk[1] < playerArea[1] || chunk[1] > playerArea[3]) {
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
          this.terrain.loadRegion(...regionCoords, new DataView(Uint8Array.from(fileBuffer).buffer));
        }).catch(()=>{
          console.log("Couldn't find region file for region " + region + ". Generating one...");
          this.terrain.addRegion(new Terrain.TileRegion(...regionCoords));
          for (let chunk of inUnloadedRegion.get(region)) {
            //Add the loaded regions needed chunks to the loaded list.
            let coords = chunk.split(',');
            this.terrain.getChunk(...coords).generate(this.level.perlin, ...regionCoords);
          }
        }).finally(()=>{
          if (this.waitingPlayers.has(region)) {
            for (let [playerId, chunks] of this.waitingPlayers.get(region)) {
              let player = Player.list.get(playerId);
              // TODO: Optimise so only getting data once per chunk using inUnloadedRegion below..
              if (connection.connections[player.socketID]) {
                let data = chunks.map((c)=>this.terrain.getChunk(...c).getClientData(...regionCoords));
                console.log(data.flat());
                connection.connections[player.socketID].socket.emit('chunk-load', new Uint8Array([data.length, ...data.flat(), 0]))
              }
            }
          }
          for (let chunk of inUnloadedRegion.get(region)) {
            //Add the loaded regions needed chunks to the loaded list.
            this.loadedChunks.add(chunk);
          }
          inUnloadedRegion.delete(region);
        })
      }

      //Add the loading chunks to the loaded list.
      for (let chunk of toLoad) {
        this.loadedChunks.add(chunk)
      }
      for (let playerId of playerIds) {
        let player = Player.list.get(playerId);
        if ((playerLoads.get(playerId).length > 0 || playerUnloads.get(playerId).length > 0) && connection.connections[player.socketID] ) {
          let data = {load: playerLoads.get(playerId).map(c=>this.terrain.getChunk(...c).getClientData(...c.map(d=>Math.floor(d/32)))), unload: playerUnloads.get(playerId)};
          connection.connections[player.socketID].socket.emit('chunk-load', new Uint8Array([data.load.length, ...data.load.flat(), data.unload.length, ... new Uint8Array(new Int32Array(data.unload.flat()).buffer)]));
        }
      }


      let regionLoaders = new Map();

      //for all unloading chunks check if they are the last chunk to be unloaded in their region.
      for (let chunk of this.loadedChunks) {
        let region = chunk.split(',').map(e=>Math.floor(e/32));
        let regionString = region.join(',');
        if (!regionLoaders.has(regionString)) regionLoaders.set(regionString, new Set());
        regionLoaders.get(regionString).add(chunk);
      }
      for (let chunk of toUnload) {
        //If they are save and unload the region.
        let region = chunk.split(',').map(e=>Math.floor(e/32));
        let regionString = region.join(',');
        if (regionLoaders.has(regionString) && regionLoaders.get(regionString).has(chunk)) {
          regionLoaders.get(regionString).delete(chunk);
          if (regionLoaders.get(regionString).size <= 0) {
            //Unload the region.
            let data = this.terrain.getRegionSaveData(...region);
            fsp.writeFile(path.join(this.level.getSaveLocation(),'regions', this.netID, `r.${regionCoords[0]}.${regionCoords[1]}.region`), data).then(()=>{
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
