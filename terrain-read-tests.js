const fs = require('fs');
const os = require('os');
const path = require("path");
const {TextDecoder} = require('util');
const littleEndian = os.endianness() == 'LE'

let savedChunks = new Map();
let reader = new (class {
  constructor(){
    this._pointer = 0
  }

  get pointer() {
    return this._pointer;
  }

  set pointer(p) {
    //console.log(`${p} (${p.toString(16)})`);
    this._pointer = p;
  }
})()
reader.pointer = 0;

let decoder = new TextDecoder();

let startTime = process.hrtime();

let fileBuffer = fs.readFileSync('./testWorld/r.0.0.region');
let regionData = new DataView(Uint8Array.from(fileBuffer).buffer);

for (let i = 0; i < 32; i ++) {
  for (let j = 0; j < 32; j ++) {
    let location = regionData.getUint32(reader.pointer, littleEndian);
    if (location != 0) savedChunks.set(`(${i},${j})`, location - 1)
    reader.pointer += 4;
  }
}

for (let [chunkId, location] of savedChunks) {
  console.log("Reading chunk " + chunkId + " at " + location + "(" + location.toString(16) + ")");
  reader.pointer = 4096 + location;
  let coords = [regionData.getUint8(reader.pointer, littleEndian), regionData.getUint8(reader.pointer + 1, littleEndian)];
  //console.log(coords);
  reader.pointer += 2;
  let chunkSize = regionData.getUint32(reader.pointer, littleEndian);
  //console.log(chunkSize);
  reader.pointer += 4;
  let end = reader.pointer + chunkSize;
  while (reader.pointer < end) {
    let coordByte = regionData.getUint8(reader.pointer, littleEndian);
    reader.pointer += 1;
    let [x, y] = [coordByte >>> 4, coordByte % 16];
    console.log(`Tile (${x}, ${y})`);
    let size = regionData.getUint16(reader.pointer, littleEndian);
    //console.log(`Number of resource types: ${size}`);
    reader.pointer += 2;
    for (let i = 0; i < size; i ++) {
      let length = regionData.getUint16(reader.pointer, littleEndian);
      //console.log(`Resource name with length ${length}`);
      reader.pointer += 2;
      let nameData = new Uint8Array(regionData.buffer, reader.pointer, length);
      //console.log(nameData);
      let name = decoder.decode(nameData);
      //console.log("Name:");
      //console.log(name);
      reader.pointer += length;
      let amount = regionData.getFloat32(reader.pointer, littleEndian);
      reader.pointer += 4;
      console.log(`Resource ${name}: ${amount}`);
    }
  }
}

let totalTime = process.hrtime(startTime);
console.log("Time taken: %ds %dms", totalTime[0], totalTime[1] / 1000000);
