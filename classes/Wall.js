const {Rectangle, CollisionGroup, ConnectionManager, NetworkWrapper, TrackList} = require('electron-game-util');
const Entity = require('./Entity.js');

let list = new TrackList(SIDE, true);

class Wall extends NetworkWrapper(CollisionGroup(CollisionGroup(Entity, 'Wall'), 'lightingSolid'),list) {
  constructor(opts){
    super(opts);
    this.solid = true;
  }

  show(gc, world){
    if (world.netID != this.world.netID) return;
    gc.fill(179,1);
    gc.stroke(128,1);
    gc.rect(this.x, this.y, this.w, this.h);
  }

  damage(){
    ;
  }
}

list.setType(Wall);

Wall.list = list;

list.update = ()=>{};

module.exports = Wall;
