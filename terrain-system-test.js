const fs = require('fs');
const path = require("path");
const Terrain = require('./classes/Terrain.js');
const {createCanvas} = require('canvas');

let canvas = createCanvas(512, 512);
let ctx = canvas.getContext('2d');

let fileBuffer = fs.readFileSync('./testWorld/r.0.0.region');
let regionData = new DataView(Uint8Array.from(fileBuffer).buffer);

let terrain = new Terrain();
terrain.loadRegion(0, 0, regionData);

let shades = ['█','▓','▒','░'].reverse();

let imgData = ctx.getImageData(0, 0, 512, 512);

for (let i = 0; i < 512; i ++) {
  // let line = "";
  for (let j = 0; j < 512; j ++) {
    let pixelStart = (j * 512 + i) * 4;
    // console.log(terrain.getRegion(0,0).getChunk(Math.floor(i / 16), Math.floor(j / 16)));
    if (terrain.getRegion(0,0).getChunk(Math.floor(i / 16), Math.floor(j / 16)).populated) {
      imgData.data[pixelStart] = imgData.data[pixelStart + 1] = imgData.data[pixelStart + 2] = Math.floor(255 * (terrain.getTileAt(i, j).getResource('coal') / 15))
      imgData.data[pixelStart + 3] = 255;
      // console.log(i, j);
      // line += shades[4 * Math.floor(terrain.getTileAt(i, j).getResource('coal') / 50)];
    } else {
      imgData.data[pixelStart] = imgData.data[pixelStart + 1] = imgData.data[pixelStart + 2] = 0;
      imgData.data[pixelStart + 3] = 255;
    }
  }
  // console.log(line);
}

ctx.putImageData(imgData, 0, 0);

fs.writeFileSync('./testWorldMap.png', canvas.toBuffer('image/png'));
