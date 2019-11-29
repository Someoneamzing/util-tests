const {TrackList, GUI: GUILoader} = require('electron-game-util');
const GUI = GUILoader(connection);
const Building = require("./Building.js");
const Inventory = require("./Inventory.js");

let list = new TrackList(SIDE, true);

class Chest extends NetworkWrapper(Building, list, ["inventoryID", "customName"]) {
  constructor(opts = {}){
    super(opts);
    let {inventoryID} = opts;
    this.inventoryDirty = false;
    if (SIDE == ConnectionManager.SERVER) {
        let inventory = new Inventory(opts.inventory?opts.inventory:{size: 27, hotbarSize: 0});
        this.inventoryID = inventory.netID;
    }
    if (SIDE == ConnectionManager.CLIENT) {
      this.inventoryID = opts.inventoryID;
    }

  }

  get inventory(){
    return Inventory.list.get(this.inventoryID);
  }

  update(pack){
    super.update(pack);
    switch(SIDE){
      case ConnectionManager.SERVER:
        this.inventoryDirty = this.inventory.isDirty();
        if (this.inventoryDirty) console.log("DIRTY");

        break;

    }
  }

  getCustomName(prop, oldVal, newVal){
    return this.customName !== null?this.customName:"Chest";
  }

  show(gc, world){
    if (world.netID != this.world.netID) return;
    gc.fill('#a67633');
    gc.stroke('#4a3100');
    gc.rect(this.x, this.y, this.w, this.h);
  }

  static get gui(){
    return GUI.list['chest'];
  }
}

list.setType(Chest);

Chest.list = list;

module.exports = Chest
