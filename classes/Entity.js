const {Point, Rectangle, CollisionGroup, ConnectionManager, NetworkWrapper, TrackList, QueryResult} = require('electron-game-util');
const World = require('./World.js');

let list = new TrackList(SIDE, false, false);
let lightEmitters = new Map();

class Entity extends NetworkWrapper(CollisionGroup(Rectangle, "Entity"), list, ["x", "y", "w", "h", "health", "maxHealth", "hsp", "vsp", "worldID", "damageTime", "solid", "isLightEmitter"]) {
  constructor(opts = {}){
    let {x = 0,y = 0,w = 32,h = 32,world = 'main',hsp = 0, vsp = 0} = opts;
    super(opts,x,y,w,h);
    this.hsp = hsp;
    this.vsp = vsp;
    this.worldID = world;
    this.mask = this;
    this.solid = opts.solid || false;
    this.maxHealth = typeof opts.maxHealth != "undefined" ? opts.maxHealth : 20;
    this.health = typeof opts.health != "undefined" ? opts.health : this.maxHealth;
    this.damageTime = 0;
    this.isLightEmitter = typeof opts.isLightEmitter != 'undefined' ? opts.isLightEmitter : false;
    if (this.isLightEmitter) {
      this.light = null;
      lightEmitters.set(this.netID, this);
    }
  }

  remove(){
    if (this.isLightEmitter) lightEmitters.delete(this.netID);
    super.remove();
  }

  get world(){
    return World.list.get(this.worldID);
  }

  damage(amount, source){
    this.health = Math.max(0, Math.min(this.health -= amount, this.maxHealth));
    if (amount > 0) this.damageTime = 30;
    if (this.health <= 0) {
      this.kill(source);
    }
  }

  kill(killer){
    this.remove();
  }

  move(){
    if(this.collision(this.x + this.hsp, this.y, true)){
      while(!this.collision(this.x + Math.sign(this.hsp), this.y, true)){
        this.x += Math.sign(this.hsp);
      }
      this.hsp = 0;
    }
    this.hsp != 0 ? this.x += this.hsp: "";

    if(this.collision(this.x, this.y + this.vsp, true)){
      while(!this.collision(this.x, this.y + Math.sign(this.vsp), true)){
        this.y += Math.sign(this.vsp);
      }
      this.vsp = 0;
    }
    this.vsp != 0 ? this.y += this.vsp : "";
  }

  update(pack){
    super.update(pack);
    if(SIDE == ConnectionManager.SERVER){
      this.move();
      if (this.damageTime > 0) this.damageTime --;

      // case ConnectionManager.CLIENT:
      //   this.x = pack.x;
      //   this.y = pack.y;
      //   this.w = pack.w;
      //   this.h = pack.h;
      //   this.health = pack.health;
      //   this.maxHealth = pack.maxHealth;
      //   this.hsp = pack.hsp;
      //   this.vsp = pack.vsp;
      //   this.worldID = pack.world;
      //   this.damageTime = pack.damageTime;

    }
  }

  // getUpdatePkt(){
  //   let pack = super.getUpdatePkt();
  //   pack.x = this.x;
  //   pack.y = this.y;
  //   pack.w = this.w;
  //   pack.h = this.h;
  //   pack.health = this.health;
  //   pack.maxHealth = this.maxHealth;
  //   pack.vsp = this.vsp;
  //   pack.hsp = this.hsp;
  //   pack.world = this.world.netID;
  //   pack.damageTime = this.damageTime;
  //   return pack;
  // }

  // getInitPkt(){
  //   let pack = super.getInitPkt();
  //   pack.x = this.x;
  //   pack.y = this.y;
  //   pack.w = this.w;
  //   pack.h = this.h;
  //   pack.health = this.health;
  //   pack.maxHealth = this.maxHealth;
  //   pack.vsp = this.vsp;
  //   pack.hsp = this.hsp;
  //   pack.world = this.world.netID;
  //   return pack;
  // }

  collision(x = this.x,y = this.y,solid = false,types){
    let mask = this.mask.copyShape();
    mask.x = x;
    mask.y = y;
    let res = this.world.collisionTree.query(mask, typeof types == 'string'?[types]:types).getGroup('found');
    for (let e of res){
      if (solid && !e.solid) continue;
      if (e.netID != this.netID) return e;
    }
    return false;
  }

  nearest(x = this.x, y = this.y, solid = false, distance = 0, types){
    let res = this.world.collisionTree.nearest(new Point(x,y), typeof types == 'string'?[types]:types, distance).getGroup('found');
    if (res.length > 0){
      return res[0];
    } else {
      return false;
    }
  }

  static registerCollidables(){
    for(let id of World.list.getIds()){
      World.list.get(id).collisionTree.clear();
    }
    for (let id of Entity.list.getIds()){
      let e = Entity.list.get(id);
      // echo(e.netID);
      e.world.collisionTree.insert(e);
    }
  }

  static getLightEmitters(worldID) {
    return Array.from(lightEmitters.values()).filter(e=>e.worldID == worldID);
  }
}

list.setType(Entity);

Entity.list = list;

//if (SIDE == ConnectionManager.SERVER) Entity.collisionTree = new QuadTree(new Rectangle(0,0,10000,10000), 10);

module.exports = Entity;
