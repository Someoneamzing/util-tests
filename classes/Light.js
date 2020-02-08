const {Color, Point} = require('electron-game-util');

const Entity = require('./Entity.js');

class Light extends Point {
  constructor(ownerID, x, y, color, intensity, constant, linear, exponent){
    super(x, y);
    this.color = color;
    this.ownerID = ownerID;
    this.intensity = intensity;
    this.atten = {constant, linear, exponent};

  }

  data(gc){
    //let coords = {x: this.x + gc.w / 2, h: gc.h - (this.y + gc.h/2)};//gc.getScreenCoords(0, 0);
    // console.log(coords);
    let owner = Entity.list.get(this.ownerID);
    return [this.intensity, 0, (this.x + owner.x) + gc.w/2 - gc.camera.x, gc.h - (( this.y - owner.y) + gc.h/2 + gc.camera.y), this.atten.constant, this.atten.linear, this.atten.exponent, 0, this.color.r / 255, this.color.g / 255, this.color.b / 255, 0];
  }
}

module.exports = Light;
