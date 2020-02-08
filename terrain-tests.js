const fs = require('fs');
const path = require("path");
const Terrain = require('./classes/Terrain.js');
const SimplexNoise = require('simplex-noise');

let simplex = new SimplexNoise('testWorld');
let terrain = new Terrain();
let region = new Terrain.TileRegion(0, 0);
terrain.addRegion(region)
// region.getChunk(0,0).generate(simplex, 0, 0);
// region.getChunk(0,1).generate(simplex, 0, 0);
// region.getChunk(0,4).generate(simplex, 0, 0);
// region.getChunk(2,0).generate(simplex, 0, 0);
// region.getChunk(2,5).generate(simplex, 0, 0);
for (let i = 10; i < 20; i ++) {
  for (let j = 10; j < 20; j ++) {
    region.getChunk(i, j).generate(simplex, 0, 0)
  }
}
// region.getChunk(0,0).getTileAt(0,4).addResource('coal', 43.4);
//console.log(region.getChunk(0,0));
if (!fs.existsSync('./testWorld')) {
  fs.mkdirSync('./testWorld');
}
let start = process.hrtime();
//console.log("Saving data...");
for (let [file, data] of terrain.getSaveData()){
  //console.log("working " + file);
  fs.writeFileSync(path.join('./testWorld', file), data);
  //console.log('Done with ' + file);
}
let time = process.hrtime(start);
console.log("Finished: %ds %dms", time[0], time[1] / 1000000);
