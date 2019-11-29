const {Rectangle, CollisionGroup, ConnectionManager, NetworkWrapper, TrackList} = require('electron-game-util');
const Entity = require('./Entity.js');
const Player = require('./Player.js');
const ItemData = require('./ItemData.js');

let list = new TrackList(SIDE, true);

class ItemEntity extends NetworkWrapper(CollisionGroup(Entity,'Item'), list, ["type", "count", "pickupDelay", "data"]) {
  constructor(opts = {}){
    super(opts);
    let {type = 'stone', count = 1, pickupDelay = 0, data = {}} = opts;
    this.type = type;
    this.count = count;
    this.pickupDelay = pickupDelay;
    this.data = new ItemData(data);
  }

  update(pack){
    super.update(pack);
    switch (SIDE) {
      case ConnectionManager.SERVER:
        if (this.data.isDirty()) this.dirtyProps["data"] = true;
        if (this.pickupDelay <= 0){
          let p = this.collision(this.x, this.y, false, 'Player');
          if (p) {
            this.count -= p.inventory.add(this.type, this.count, this.data);
            if (this.count <= 0) this.remove();
          }
        } else {
          this.pickupDelay = Math.max(this.pickupDelay - 1, 0);
        }
      // case ConnectionManager.CLIENT:
      //   this.type = pack.type;
      //   this.count = pack.count;
      //   this.pickupDelay = pack.pickupDelay;
      //   break;
    }
  }

  // getUpdatePkt(){
  //   let pack = super.getUpdatePkt();
  //   pack.count = this.count;
  //   pack.type = this.type;
  //   pack.pickupDelay = this.pickupDelay;
  //   return pack;
  // }

  // getInitPkt(){
  //   let pack = super.getInitPkt();
  //   pack.count = this.count;
  //   pack.type = this.type;
  //   pack.pickupDelay = this.pickupDelay;
  //   return pack;
  // }

  show(gc, world){
    if (world.netID != this.world.netID) return;
    Sprite.get('item-' + this.type).draw(gc, this.x, this.y, 32, 32);
  }
}

list.setType(ItemEntity);

ItemEntity.list = list;

module.exports = ItemEntity;
