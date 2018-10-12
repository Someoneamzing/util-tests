const {Rectangle, CollisionGroup, ConnectionManager, NetworkWrapper, TrackList} = require('electron-game-util');
const Entity = require('./Entity.js');
const ItemEntity = require('./ItemEntity.js');
const Item = require('./Item.js');
const World = require('./World.js');
const Inventory = require('./Inventory.js');
const Spell = require('./Spell.js');

let list = new TrackList(SIDE);

class Player extends NetworkWrapper(CollisionGroup(Entity, 'Player'),list) {
  constructor(opts){
    super(opts);
    const {spells = []} = opts;
    this.socketID = opts.socketID;
    this.name = opts.name;
    this.lastLeft = false;
    this.lastMiddle = false;
    this.lastRight = false;
    this.spells = spells;

    if (SIDE == ConnectionManager.SERVER) {
      this.controls = connection.connections[this.socketID].controls;
      let inventory = new Inventory({size: 36, hotbarSize: 9});
      this.inventoryID = inventory.netID;
    }
    if (SIDE == ConnectionManager.CLIENT) {
      this.mouse = opts.mouse;
      this.inventoryID = opts.inventoryID;
    }
    this.walkSpeed = 3;

    Player.nameMap[this.name] = this.netID;
  }

  get inventory(){
    return Inventory.list.get(this.inventoryID);
  }

  kill(killer){
    this.x = 0;
    this.y = 0;
    this.health = this.maxHealth;
    connection.server.send('player-killed', {killer: killer.getInitPkt()}, this.socketID);
  }

  useSpell(id, level){
    if (this.spells.includes(id)) Spell.sandbox[level?{"med": "runMed", "low": "runLow", "admin": "runAdmin"}[level]:"runLow"](Spell.list.get(id));
  }

  damage(amount, source){
    connection.server.send('player-damage', {amount, source: source.getInitPkt()}, this.socketID);
    super.damage(amount,source);
  }

  show(gc, world){
    if (world.netID != this.world.netID) return;
    gc.fill(153, 0, 255);
    gc.stroke(92, 0, 153);
    gc.rect(this.x, this.y, this.w, this.h);
    gc.fill('black');
    gc.noStroke();
    gc.textAlign('center', 'bottom');
    gc.text(this.name, this.x, this.y - this.h/2 - 20);
    gc.fill(HEALTH_BG_COLOUR);
    gc.stroke('grey');
    gc.rect(this.x, this.y - this.h/2 - 10, 32, 5);
    gc.fill(HEALTH_COLOUR);
    gc.noStroke();
    gc.cornerRect(this.x - 16, this.y - this.h/2 - 12.5, (this.health/this.maxHealth) * 32, 5);
  }

  update(pack){
    switch(SIDE){
      case ConnectionManager.SERVER:
        this.controls = connection.connections[this.socketID].controls;
        if (this.controls){
          let mouse = this.controls.mouse;
          this.hsp = (Number(this.controls.keys["D"]||0) - Number(this.controls.keys['A']||0)) * this.walkSpeed;
          this.vsp = (Number(this.controls.keys["S"]||0) - Number(this.controls.keys['W']||0)) * this.walkSpeed;
          if (this.inventory.selected){
            if (mouse.left == true && this.lastLeft == false){
              Item.attack(this.inventory.selected, this);
            }
            if (mouse.right == true && this.lastRight == false){
              Item.use(this.inventory.selected, this);
            }
          }


          this.lastLeft = mouse.left;
          this.lastRight = mouse.right;
          this.lastMiddle = mouse.middle;
        }

        super.update()
        break;

      case ConnectionManager.CLIENT:
        super.update(pack);
        this.mouse = pack.mouse;
        this.name = pack.name;
        this.inventoryID = pack.inventoryID;
        this.spells = pack.spells;
        break;
    }
  }

  getUpdatePkt(){
    let pack = super.getUpdatePkt();
    if (this.controls) {pack.mouse = {x: this.controls.mouse.x, y: this.controls.mouse.y};} else {pack.mouse = {x: 0, y: 0}}
    pack.inventoryID = this.inventoryID;
    pack.name = this.name;
    pack.spells = this.spells;
    return pack;
  }

  getInitPkt(){
    let pack = super.getInitPkt();
    pack.mouse = {x: 0, y: 0};
    pack.inventoryID = this.inventoryID;
    pack.name = this.name;
    pack.spells = this.spells;
    return pack;
  }

  remove(){
    delete Player.nameMap[this.name];
    super.remove();
  }

  static getPermissions(playername) {
    return Player.permissions[playername] || Player.DEFAULT_PERMISSIONS;
  }

  static getByName(name){
    return Player.nameMap[name]?Player.list.get(Player.nameMap[name]):null;
  }
}

Player.nameMap = {};

Player.permissions = {};

Player.DEFAULT_PERMISSIONS = "none";

list.setType(Player);

Player.list = list;

module.exports = Player;