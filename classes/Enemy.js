const {Rectangle, CollisionGroup, ConnectionManager, NetworkWrapper, TrackList} = require('electron-game-util');
const Entity = require('./Entity.js');
const Player = require('./Player.js');

let list = new TrackList(SIDE);

class Enemy extends NetworkWrapper(CollisionGroup(Entity, 'Enemy'),list) {
  constructor(opts = {}){
    super(opts);
    let {attackDamage = 5} = opts;
    this.socketID = opts.socketID;
    this.walkSpeed = 1;
    this.targetID = null;
    this.cooldown = 0;
    this.attackDamage = attackDamage;
    this.maxRange = 1000;
  }

  show(gc){
    gc.fill(230, 0, 0);
    gc.stroke(128, 0, 0);
    gc.rect(this.x, this.y, this.w, this.h);
  }

  update(pack){
    switch(SIDE){
      case ConnectionManager.SERVER:
        if (this.targetID && Player.list.get(this.targetID) && Player.list.get(this.targetID).health > 0){
          let target = Player.list.get(this.targetID);
          let xdir = Math.sign(target.x - this.x);
          let ydir = Math.sign(target.y - this.y);
          this.hsp = xdir * this.walkSpeed;
          this.vsp = ydir * this.walkSpeed;
          if (this.cooldown <= 0){
            let p = this.collision(this.x, this.y, false, 'Player')
            if (p){
              p.damage(this.attackDamage, this);
              this.cooldown = 180;
            }
          }
        } else {
          if (this.cooldown <= 0){
            let res = this.nearest(this.x, this.y, false, this.maxRange, 'Player');
            if (res) {this.targetID = res.netID;} else {
              this.cooldown = 300;
            }
          }
        }
        if (this.cooldown > 0) {
         this.cooldown = Math.max(this.cooldown - 1, 0);
        }

        super.update()
        break;

      case ConnectionManager.CLIENT:
        super.update(pack);
        this.attackDamage = pack.attackDamage;
        break;
    }
  }

  getUpdatePkt(){
    let pack = super.getUpdatePkt();
    pack.attackDamage = this.attackDamage;
    return pack;
  }

  getInitPkt(){
    let pack = super.getUpdatePkt();
    pack.attackDamage = this.attackDamage;
    return pack;
  }

  remove(){
    super.remove();
  }
}

list.setType(Enemy);

Enemy.list = list;

module.exports = Enemy;
