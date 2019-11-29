const {Rectangle, CollisionGroup, ConnectionManager, NetworkWrapper, TrackList, Sprite} = require('electron-game-util');
const Entity = require('./Entity.js');
const World = require('./World.js');

let list = new TrackList(SIDE, true);

class Teleporter extends NetworkWrapper(CollisionGroup(Entity, 'Teleporter'),list,["toX","toY","to"]) {
  constructor(opts){
    super(opts);
    this.to = opts.to;
    this.toX = opts.toX;
    this.toY = opts.toY;
    this.w = 48;
    this.h = 48;
  }

  update(pack){
    super.update(pack);
    if(SIDE == ConnectionManager.SERVER){
      let p = this.collision(this.x, this.y, false, 'Player');
      if (p){
        p.world = World.list.get(this.to);
        p.x = this.toX;
        p.y = this.toY;
      }
      // case ConnectionManager.CLIENT:
      //   this.toX = pack.toX;
      //   this.toY = pack.toY;
      //   this.to = pack.to;
      //   break;
    }
  }

  show(gc, world){
    if (world.netID != this.world.netID) return;
    Sprite.get('teleporter').draw(gc, this.x, this.y, this.w, this.h);
  }

  damage(){
    ;
  }

  // getInitPkt(){
  //   let pack = super.getInitPkt();
  //   pack.to = this.to;
  //   pack.toX = this.toX;
  //   pack.toY = this.toY;
  //   return pack;
  // }

  // getUpdatePkt(){
  //   let pack = super.getUpdatePkt();
  //   pack.to = this.to;
  //   pack.toX = this.toX;
  //   pack.toY = this.toY;
  //   return pack;
  // }
}

list.setType(Teleporter);

Teleporter.list = list;

module.exports = Teleporter;
