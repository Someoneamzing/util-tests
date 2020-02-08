const path = require('path');
const fs = require('fs');
const SimplexNoise = require('simplex-noise');
const World = require('./World.js')

class Level {
  constructor(name, seed) {
    this.name = name;
    this.seed = seed;
    this.perlin = new SimplexNoise(seed);
  }

  getSaveLocation(){
    return path.join(process.cwd(),'saves', this.name);
  }

  load(){
    echo('Loading world...');
    try {
      fs.mkdirSync('saves/' + this.name , {recursive:true})
    } catch (e){console.log(e);}
    for (let worldID of World.list.getIds()) {
      World.list.get(worldID).load();
    }
    try {
      connection.deserialise(fs.readFileSync(path.join(level.getSaveLocation(),'data.json'), 'utf-8'))
      echo('Done loading!')
    } catch (e) {
      echo("No world found or possible error in loading save. Generating new world.")
    }
  }
}

module.exports = Level;
