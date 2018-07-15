const {Rectangle, CollisionGroup, ConnectionManager, NetworkWrapper, TrackList} = require('electron-game-util');
const Entity = require('./Entity.js');
const Player = require('./Player.js');

let list = new TrackList(SIDE);

class ItemEntity extends NetworkWrapper(CollisionGroup(Entity,'Item'), list) {
  constructor(opts = {}){
    super(opts);
    let {type = 'stone', count = 1, pickupDelay = 0} = opts;
    this.type = type;
    this.count = count;
    this.pickupDelay = 0;
  }

  update(pack){
    switch (SIDE) {
      case ConnectionManager.SERVER:
        if (this.pickupDelay <= 0){
          let p = this.collision(this.x, this.y, false, 'Player');
          if (p) {
            this.count -= p.inventory.add(this.type, this.count);
            if (this.count <= 0) this.remove();
          }
        } else {
          this.pickupDelay = Math.max(this.pickupDelay - 1, 0);
        }
        super.update()
        break;
      case ConnectionManager.CLIENT:
        super.update(pack);
        this.type = pack.type;
        this.count = pack.count;
        this.pickupDelay = pack.pickupDelay;
        break;
    }
  }

  getUpdatePkt(){
    let pack = super.getUpdatePkt();
    pack.count = this.count;
    pack.type = this.type;
    pack.pickupDelay = this.pickupDelay;
    return pack;
  }

  getInitPkt(){
    let pack = super.getInitPkt();
    pack.count = this.count;
    pack.type = this.type;
    pack.pickupDelay = this.pickupDelay;
    return pack;
  }

  show(gc){
    Sprite.get('item-' + this.type).draw(gc, this.x, this.y, 32, 32);
  }
}

list.setType(ItemEntity);

ItemEntity.list = list;

module.exports = ItemEntity;
