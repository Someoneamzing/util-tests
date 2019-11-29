const {Rectangle, CollisionGroup, ConnectionManager, NetworkWrapper, TrackList, Line, Vector} = require('electron-game-util');
const Entity = require('./Entity.js');
const Player = require('./Player.js');

let list = new TrackList(SIDE);

class Arrow extends NetworkWrapper(CollisionGroup(Entity,'Arrow'), list, ["power", "dir"]) {
  constructor(opts = {}){
    super(opts);
    let {power = 1, owner} = opts;
    this.power = power;
    this.owner = owner;
    this.h = 8;
    this.w = 8;
    this.age = 0;
    this.mask = new Line(this.x - this.hsp, this.y - this.vsp, this.x + this.hsp, this.y + this.vsp);
    this.dir = Math.atan2(this.vsp, this.hsp);
  }

  update(pack){
    if (SIDE == ConnectionManager.SERVER){
      if (this.hsp == 0 && this.vsp == 0) {

      } else {
        this.mask.set(this.x - this.hsp, this.y - this.vsp, this.x + this.hsp, this.y + this.vsp);
        if (this.dirtyProps['hsp'] || this.dirtyProps['vsp']) this.dir = Math.atan2(this.vsp, this.hsp);
        let obs = this.collision(this.x + this.hsp, this.y + this.hsp, false, ["Wall", "Enemy", "Player"]);
        if (obs && obs.netID !== this.owner) {
          if (obs instanceof Player || obs instanceof Enemy) {
            obs.damage(this.power, Player.list.get(this.owner))
            this.kill()
          } else {
            let off = new Vector(this.hsp, this.vsp).norm().mult(16);

            let test = new Line(this.x, this.y, this.x + off.x + this.hsp, this.y + off.y + this.vsp);
            let int = null;
            let ints = obs.intersection(test);
            if (Array.isArray(ints)) {
              int = Point.closestTo(test.a, ints);
            } else {
              int = ints;
            }
            this.x = int.x;
            this.y = int.y;
            this.hsp = 0;
            this.vsp = 0;
          }
        }
      }
      this.age += 1;
      if (this.age > 6000) this.kill();


      // case ConnectionManager.CLIENT:
      //   this.type = pack.type;
      //   this.count = pack.count;
      //   this.pickupDelay = pack.pickupDelay;
      //   break;
    }
    super.update(pack);
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
    Sprite.get('projectile-arrow').draw(gc, this.x, this.y, 32, 8, this.dir);
  }
}

list.setType(Arrow);

Arrow.list = list;

module.exports = Arrow;
