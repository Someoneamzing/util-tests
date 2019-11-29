const {TrackList, GUI: GUILoader, GUITextBox} = require('electron-game-util');
const GUI = GUILoader(connection);
const Building = require("./Building.js");

let list = new TrackList(SIDE, true);

class Counter extends NetworkWrapper(Building, list, ["counter", "resetTime"]) {
  constructor(opts = {}){
    super(opts);
    let {resetTime = 100} = opts;
    this.counter = 0;
    this.resetTime = resetTime;
  }

  update(pack){
    super.update(pack);
    if (SIDE == ConnectionManager.SERVER){
        Math.random() > 0.9?this.counter = (this.counter + 1) % this.resetTime:'';
    }
  }

  counterColor(prop, oldVal, newVal){
    let t = newVal/this.resetTime;
    t = 4 * ((t - 0.5) ** 3) + 0.5;
    return `hsl(${t * 120},100%,50%)`;
  }

  reset(){
    this.counter = 0;
  }

  setReset(newValue){
    console.log("Setting reset to " + newValue);
    this.resetTime = newValue;
  }

  show(gc, world){
    if (world.netID != this.world.netID) return;
    gc.fill('steelblue');
    gc.stroke('grey');
    gc.rect(this.x, this.y, this.w, this.h);
  }

  static get gui(){
    return GUI.list['counter'];
  }
}

list.setType(Counter);

Counter.list = list;

module.exports = Counter
