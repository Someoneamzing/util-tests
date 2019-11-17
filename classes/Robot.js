const {Rectangle, CollisionGroup, ConnectionManager, NetworkWrapper, TrackList, QueryResult, Line} = require('electron-game-util');
const Entity = require('./Entity.js');
const Player = require('./Player.js');
const Spell = require('./Spell.js');

let list = new TrackList(SIDE);

class Robot extends NetworkWrapper(CollisionGroup(Entity, 'Robot'),list, [ "state" ]) {
  constructor(opts = {}){
    super(opts);
    let {walkSpeed = 1, cooldown = 0, maxRange = 1000, state = "waiting", script = null, scriptID = null} = opts;
    this.socketID = opts.socketID;
    this.walkSpeed = walkSpeed;
    this.cooldown = cooldown;
    this.maxRange = maxRange;
    this.state = state;
    this.scriptID = script instanceof Spell ? script.netID : scriptID;
  }

  get script() {
    return Spell.list.get(this.scriptID);
  }

  show(gc, world){
    if (world.netID != this.world.netID) return;
    // switch(this.state){
    //
    // }
    gc.fill(100,100,100);
    gc.rect(this.x, this.y, this.w, this.h);
    if (this.damageTime > 0) {
      gc.fill(255,0,0,(this.damageTime)/30);
      gc.noStroke();
      gc.rect(this.x, this.y, this.w, this.h);
      gc.fill(HEALTH_BG_COLOUR);
      gc.stroke('grey');
      gc.rect(this.x, this.y - this.h/2 - 10, 32, 5);
      gc.fill(HEALTH_COLOUR);
      gc.noStroke();
      gc.cornerRect(this.x - 16, this.y - this.h/2 - 12.5, (this.health/this.maxHealth) * 32, 5);
    }

  }

  update(pack){
    super.update(pack);
    if (this.script && this.script.type != "robot") this.state = "error";
  }

  stopScript() {

  }

  remove(){
    super.remove();
  }
}

list.setType(Robot);

Robot.list = list;

module.exports = Robot;
