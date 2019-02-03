const {TrackList, GUI, GUITextBox} = require('electron-game-util');
const Building = require("./Building.js");

let list = new TrackList(SIDE);

class Counter extends NetworkWrapper(Building, list) {
  constructor(opts = {}){
    super(opts);
    let {resetTime = 100} = opts;
    this.counter = 0;
    this.resetTime = resetTime;
  }

  update(pack){
    switch(SIDE){
      case ConnectionManager.SERVER:
        super.update();
        Math.random() > 0.9?this.counter ++:'';

        break;

      case ConnectionManager.CLIENT:
        super.update(pack);
    }
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
