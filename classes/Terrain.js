const path = require("path");
const os = require('os');
const littleEndian = os.endianness() == 'LE'
const {TextEncoder, TextDecoder} = require('util');
const SimplexNoise = require('simplex-noise');

let decoder = new TextDecoder();
let encoder = new TextEncoder();


class Terrain {
  constructor(){
    this.loadedRegions = new Map();
  }

  getTileAt(x, y) {
    return this.loadedRegions.get(x - (x % Terrain.TileRegion.worldDivision)).get(y - (y % Terrain.TileRegion.worldDivision)).getTileAt(x % Terrain.TileRegion.worldDivision, y % Terrain.TileRegion.worldDivision)
  }

  getTileAtPoint(p) {
    let x = Math.floor(p.x / Terrain.TileState.tileSize)
    let y = Math.floor(p.y / Terrain.TileState.tileSize)
    return this.getTileAt(x, y);
  }

  getRegionSaveData(x, y) {
    let region = this.getRegion(x, y);
    if (region == null) return null;
    let pointer = 1;
    let chunkLocations = [];
    let regionPayload = [];
    for (let x = 0; x < 32; x ++) {
      for (let y = 0; y < 32; y ++) {
        if (region.regionChunks[x][y].populated) {
          chunkLocations.push(pointer);
          let chunk = region.regionChunks[x][y];
          let header = new Uint8Array([...chunk.chunkCoord]);
          let payload = chunk.chunkTiles.reduce((acc1,e,tx)=>{return acc1.concat(e.reduce((acc2,tile,ty)=>{
            if (!tile.hasResources()) return acc2;
            let resourceData = tile.getResources().reduce((d,[name, amount])=>{let nameArr = encoder.encode(name);return d.concat([...new Uint8Array(new Uint16Array([nameArr.length]).buffer), ...nameArr, ...new Uint8Array(new Float32Array([amount]).buffer)])},[]);
            return acc2.concat([(tx<<4) | ty ,...new Uint8Array(new Uint16Array([tile.heldResources.size]).buffer),...resourceData]);
          }, []))}, []);
          pointer += header.length + payload.length + 4;
          regionPayload = regionPayload.concat([...header, ...new Uint8Array(new Uint32Array([payload.length]).buffer), ...payload])
        } else {
          chunkLocations.push(0);
        }
      }
    }

    chunkLocations = Uint32Array.from(chunkLocations);

    return new Uint8Array([...new Uint8Array(chunkLocations.buffer),...regionPayload]);
  }

  unloadRegion(x, y) {
    if (this.loadedRegions.has(x) && this.loadedRegions.get(x).has(y)) { this.loadedRegions.get(x).delete(y); }
  }

  loadRegion(x, y, regionData) {
    let yMap = (this.loadedRegions.has(x)?this.loadedRegions:this.loadedRegions.set(x, new Map())).get(x);
    if (yMap.has(y)) {
      throw new Error(`Terrain: Attempted to load region at (${x}, ${y}) that was already loaded.`)
    } else {
      let region = new Terrain.TileRegion(x, y);
      let pointer = 0;

      let chunkLocations = new Map();

      for (let i = 0; i < 32; i ++) {
        for (let j = 0; j < 32; j ++) {
          let location = regionData.getUint32(pointer, littleEndian);
          if (location != 0) chunkLocations.set([i, j], location - 1)
          pointer += 4;
        }
      }
      console.log(chunkLocations);

      for (let [chunkId, location] of chunkLocations) {
        pointer = 4096 + location;
        let coords = [regionData.getUint8(pointer, littleEndian), regionData.getUint8(pointer + 1, littleEndian)];
        let chunk = region.getChunk(...coords);
        chunk.populate();
        pointer += 2;
        let chunkSize = regionData.getUint32(pointer, littleEndian);
        pointer += 4;
        let end = pointer + chunkSize;
        while (pointer < end) {
          let coordByte = regionData.getUint8(pointer, littleEndian);
          pointer += 1;
          let [x, y] = [coordByte >>> 4, coordByte % 16];
          let tile = chunk.getTileAt(x, y);
          let size = regionData.getUint16(pointer, littleEndian);
          pointer += 2;
          for (let i = 0; i < size; i ++) {
            let length = regionData.getUint16(pointer, littleEndian);
            pointer += 2;
            let nameData = new Uint8Array(regionData.buffer, pointer, length);
            let name = decoder.decode(nameData);
            pointer += length;
            let amount = regionData.getFloat32(pointer, littleEndian);
            pointer += 4;
            tile.addResource(name, amount);
          }
        }
      }



      //Last step to avoid race conditions.
      this.addRegion(region);
    }
  }

  getChunk(x, y) {
    //console.log("Terrain getting chunk: " + x + ", " + y);
    let region = [Math.floor(x/32), Math.floor(y/32)];
    let regionChunk = [x%32,y%32]
    if (regionChunk[0] < 0) regionChunk[0] += 32;
    if (regionChunk[1] < 0) regionChunk[1] += 32;
    //console.log(region);
    return this.getRegion(...region).getChunk(...regionChunk);
  }

  getTilesIn(bounds) {
    let res = [];
    let aabb = bounds.getEnclosingAABB();
    let tileSize = Terrain.TileState.tileSize;
    let corners = {sx: Math.floor((aabb.x - aabb.w / 2)/tileSize), sy: Math.floor((aabb.y - aabb.h/2)/tileSize), bx: Math.floor((aabb.x + aabb.w / 2)/tileSize), by: Math.floor((aabb.y + aabb.h/2)/tileSize)}
    for (let i = sx; i < bx; i ++) {
      for (let j = sy; j < by; j ++) {
        if (Rectangle.fromCorners(i * tileSize, j * tileSize, (i + 1)  * tileSize, (j + 1) * tileSize).intersects(bounds)){
          res.push(this.getTileAt(i,j));
        }
      }
    }
  }

  getTilesEnclosed() {
    let res = [];
    let aabb = bounds.getEnclosingAABB();
    let tileSize = Terrain.TileState.tileSize;
    let corners = {sx: Math.floor((aabb.x - aabb.w / 2)/tileSize), sy: Math.floor((aabb.y - aabb.h/2)/tileSize), bx: Math.floor((aabb.x + aabb.w / 2)/tileSize), by: Math.floor((aabb.y + aabb.h/2)/tileSize)}
    for (let i = sx; i < bx; i ++) {
      for (let j = sy; j < by; j ++) {
        if (bounds.contains(Rectangle.fromCorners(i * tileSize, j * tileSize, (i + 1)  * tileSize, (j + 1) * tileSize))){
          res.push(this.getTileAt(i,j));
        }
      }
    }
  }

  addRegion(region) {
    if (this.loadedRegions.has(region.regionCoord[0])) {
      if (this.loadedRegions.get(region.regionCoord[0]).has(region.regionCoord[1])) {
        throw new Error("Region at corrds " + region.regionCoord + " already present.");
      } else {
        this.loadedRegions.get(region.regionCoord[0]).set(region.regionCoord[1], region);
      }
    } else {
      this.loadedRegions.set(region.regionCoord[0],new Map());
      this.loadedRegions.get(region.regionCoord[0]).set(region.regionCoord[1], region);
    }
  }

  getRegion(x, y) {
    if (this.loadedRegions.has(x) && this.loadedRegions.get(x).has(y)){
      return this.loadedRegions.get(x).get(y);
    }
    return null;
  }

  getSaveData(){
    let files = new Map();
    let encoder = new TextEncoder();
    for (let [i, yMap] of this.loadedRegions){
      for (let [j, region] of yMap) {
        let pointer = 1;
        let chunkLocations = [];
        let regionPayload = [];
        for (let x = 0; x < 32; x ++) {
          for (let y = 0; y < 32; y ++) {
            if (region.regionChunks[x][y].populated) {
              chunkLocations.push(pointer);
              let chunk = region.regionChunks[x][y];
              let header = new Uint8Array([...chunk.chunkCoord]);
              let payload = chunk.chunkTiles.reduce((acc1,e,tx)=>{return acc1.concat(e.reduce((acc2,tile,ty)=>{
                if (!tile.hasResources()) return acc2;
                let resourceData = tile.getResources().reduce((d,[name, amount])=>{let nameArr = encoder.encode(name);return d.concat([...new Uint8Array(new Uint16Array([nameArr.length]).buffer), ...nameArr, ...new Uint8Array(new Float32Array([amount]).buffer)])},[]);
                return acc2.concat([(tx<<4) | ty ,...new Uint8Array(new Uint16Array([tile.heldResources.size]).buffer),...resourceData]);
              }, []))}, []);
              pointer += header.length + payload.length + 4;
              regionPayload = regionPayload.concat([...header, ...new Uint8Array(new Uint32Array([payload.length]).buffer), ...payload])
            } else {
              chunkLocations.push(0);
            }
          }
        }

        chunkLocations = Uint32Array.from(chunkLocations);

        files.set(`r.${region.regionCoord[0]}.${region.regionCoord[1]}.region`, new Uint8Array([...new Uint8Array(chunkLocations.buffer),...regionPayload]));
      }
    }
    return files;
  }

}

Terrain.TileRegion = class TileRegion {
  constructor(x, y){
    this.regionCoord = new Int8Array([x, y]);
    this.regionChunks = new Array(32);
    for (let i = 0; i < 32; i ++) {
      this.regionChunks[i] = new Array(32);
      for (let j = 0; j < 32; j ++) {
        this.regionChunks[i][j] = new Terrain.TileChunk(i, j)
      }
    }
  }

  getTileAt(x, y) {
    return this.regionChunks[Math.floor( x / Terrain.TileChunk.worldDivision)][Math.floor( y / Terrain.TileChunk.worldDivision)].getTileAt(x % Terrain.TileChunk.worldDivision, y % Terrain.TileChunk.worldDivision)
  }

  getChunk(x, y) {
    return this.regionChunks[x][y];
  }

  static get worldDivision() {
    return Terrain.TileChunk.worldDivision * 32;
  }
}

Terrain.TileChunk = class TileChunk {
  constructor(x, y){
    this.chunkCoord = SIDE == ConnectionManager.CLIENT?[x, y]:new Uint8Array([x, y]);
    this.chunkTiles = [];
    this.populated = false;
    this.dirty = false;
    if (SIDE == ConnectionManager.CLIENT) {
      this.renderData = new ImageData(Terrain.TileState.tileSize * Terrain.TileChunk.worldDivision, Terrain.TileState.tileSize * Terrain.TileChunk.worldDivision);
    }

  }

  isDirty(){
    let res = false;
    for (let i = 0; i < TileChunk.worldDivision; i ++) {
      for (let j = 0; j < TileChunk.worldDivision; j ++) {
        // let value = generator.noise2D((regionX * Terrain.TileRegion.worldDivision + this.chunkCoord[0] * Terrain.TileChunk.worldDivision + i) / 64, (regionY * Terrain.TileRegion.worldDivision + this.chunkCoord[1] * Terrain.TileChunk.worldDivision + j) / 64);
        // console.log(i, j);
        // if (value > 0.8) this.chunkTiles[i][j].addResource('coal', (value - 0.8) * 100);
        res = this.chunkTiles[i][j].isDirty() || res;
      }
    }
    if (this.dirty) {
      res = true;
      this.dirty = false;
    }
    return res;
  }

  generate(generator, regionX, regionY){
    this.populate();
    // console.log(this.chunkTiles);
    for (let i = 0; i < TileChunk.worldDivision; i ++) {
      for (let j = 0; j < TileChunk.worldDivision; j ++) {
        // let value = generator.noise2D((regionX * Terrain.TileRegion.worldDivision + this.chunkCoord[0] * Terrain.TileChunk.worldDivision + i) / 64, (regionY * Terrain.TileRegion.worldDivision + this.chunkCoord[1] * Terrain.TileChunk.worldDivision + j) / 64);
        // console.log(i, j);
        // if (value > 0.8) this.chunkTiles[i][j].addResource('coal', (value - 0.8) * 100);
        if (4 < i && i < 12 && 4 < j && j < 12) this.chunkTiles[i][j].addResource('coal', 20);
      }
    }
  }

  populate(){
    this.populated = true;
    for (let i = 0; i < TileChunk.worldDivision; i ++) {
      this.chunkTiles[i] = [];
      for (let j = 0; j < TileChunk.worldDivision; j ++) {
        this.chunkTiles[i][j] = new Terrain.TileState();
      }
    }
    this.dirty = true;
  }

  getClientData(regionX, regionY){
    let chunk = this;
    let chunkX = this.chunkCoord[0] + regionX * 32;
    let chunkY = this.chunkCoord[1] + regionY * 32;
    let header = new Uint8Array(new Int32Array([chunkX, chunkY]).buffer);
    //console.log(`Header: ${header}`);
    let payload = chunk.chunkTiles.reduce((acc1,e,tx)=>{return acc1.concat(e.reduce((acc2,tile,ty)=>{
      if (!tile.hasResources()) return acc2;
      let resourceData = tile.getResources().reduce((d,[name, amount])=>{let nameArr = encoder.encode(name);return d.concat([...new Uint8Array(new Uint16Array([nameArr.length]).buffer), ...nameArr, ...new Uint8Array(new Float32Array([amount]).buffer)])},[]);
      return acc2.concat([(tx<<4) | ty ,...new Uint8Array(new Uint16Array([tile.heldResources.size]).buffer),...resourceData]);
    }, []))}, []);
    return new Uint8Array([...header, ...new Uint8Array(new Uint32Array([payload.length]).buffer), ...payload]);
  }

  static fromClientData(data) {
    let pointer = 0;
    let coords = [data.getInt32(pointer, littleEndian), data.getInt32(pointer + 4, littleEndian)];
    let chunk = new Terrain.TileChunk(...coords);
    chunk.populate();
    pointer += 8;
    let chunkSize = data.getUint32(pointer, littleEndian);
    pointer += 4;
    let end = pointer + chunkSize;
    while (pointer < end) {
      let coordByte = data.getUint8(pointer, littleEndian);
      pointer += 1;
      let [x, y] = [coordByte >>> 4, coordByte % 16];
      let tile = chunk.getTileAt(x, y);
      let size = data.getUint16(pointer, littleEndian);
      //console.log(`Tile Resource Size: ${size}`);
      pointer += 2;
      for (let i = 0; i < size; i ++) {
        let length = data.getUint16(pointer, littleEndian);
        pointer += 2;
        let nameData = new Uint8Array(data.buffer, pointer + 4, length);
        //console.log(nameData);
        let name = decoder.decode(nameData);
        //console.log(name);
        pointer += length;
        let amount = data.getFloat32(pointer, littleEndian);
        pointer += 4;
        tile.addResource(name, amount);
      }
    }
    return chunk;
  }

  getTileAt(x, y) {
    if (x<0||x>=TileChunk.worldDivision||y<0||y>=TileChunk.worldDivision) throw new Error("IndexOutOfBounds: the coordinates (" + x + ", " + y + ") are not within this chunk.")
    return this.chunkTiles[x][y];
  }

  render(){
    Terrain.renderCtx.clearRect(0,0,Terrain.TileState.tileSize * Terrain.TileChunk.worldDivision,Terrain.TileState.tileSize * Terrain.TileChunk.worldDivision);
    let colors = {"coal": "#262626"};
    for (let i = 0; i < Terrain.TileChunk.worldDivision; i ++) {
      for (let j = 0; j < Terrain.TileChunk.worldDivision; j ++) {
        let tile = this.getTileAt(i, j);
        let resources = tile.getResources();
        let total = resources.reduce((acc, e)=>acc+e[1], 0);
        for (let [resource, amount] of resources) {
          //console.log(`Coordinates: ${i},${j} | Resource: '${resource}' | Amount: ${amount}`);
          Terrain.renderCtx.fillStyle = colors[resource];// + Math.floor(amount / total * 255).toString('16');
          Terrain.renderCtx.fillRect(i * Terrain.TileState.tileSize, j * Terrain.TileState.tileSize, Terrain.TileState.tileSize, Terrain.TileState.tileSize);
        }
      }
    }
    this.renderData = Terrain.renderCtx.getImageData(0,0,Terrain.TileState.tileSize * Terrain.TileChunk.worldDivision,Terrain.TileState.tileSize * Terrain.TileChunk.worldDivision);
    //console.log(this.renderData);
  }

  static get worldDivision() {
    return Terrain.TileState.worldDivision * 16;
  }
}

Terrain.TileState = class TileState {
  constructor(){
    this.heldResources = new Map();
    this.dirty = false;
  }

  isDirty(){
    if (this.dirty) {
      this.dirty = false;
      return true;
    }
    return false;
  }

  hasResource(name) {
    return this.heldResources.has(name);
  }

  getResource(name) {
    return this.hasResource(name)?this.heldResources.get(name):0;
  }

  addResource(name, amount) {
    this.heldResources.set(name,this.getResource(name) + amount);
    this.dirty = true;
  }

  removeResource(name, amount = Infinity) {
    let amountToTake = Math.min(this.getResource(name), amount);
    this.heldResources.set(name,this.getResource(name) - amountToTake);
    this.dirty = true;
    return amountToTake;
  }

  getResources(){
    return Array.from(this.heldResources);
  }

  hasResources(){
    return this.heldResources.size > 0;
  }

  static get worldDivision(){return 1;}

  static get tileSize(){return 32;}
}

if (SIDE == ConnectionManager.CLIENT) {
  Terrain.renderCanvas = document.createElement('canvas');
  Terrain.renderCanvas.width = Terrain.TileState.tileSize * Terrain.TileChunk.worldDivision;
  Terrain.renderCanvas.height = Terrain.TileState.tileSize * Terrain.TileChunk.worldDivision;
  Terrain.renderCtx = Terrain.renderCanvas.getContext('2d');
  //console.log(Terrain.renderCtx);
}

module.exports = Terrain;
