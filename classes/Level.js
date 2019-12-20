const path = require('path');
const SimplexNoise = require('simplex-noise');

class Level {
  constructor(name, seed) {
    this.name = name;
    this.seed = seed;
    this.perlin = new SimplexNoise(seed);
  }

  getSaveLocation(){
    return path.join(process.cwd(),'saves', this.name);
  }
}

module.exports = Level;
