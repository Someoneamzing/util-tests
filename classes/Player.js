const {Rectangle, Point, CollisionGroup, ConnectionManager, NetworkWrapper, TrackList, GUI: GUILoader} = require('electron-game-util');
const GUI = GUILoader(connection);
const Entity = require('./Entity.js');
const ItemEntity = require('./ItemEntity.js');
const Item = require('./Item.js');
const World = require('./World.js');
const Inventory = require('./Inventory.js');
const Spell = require('./Spell.js');

let list = new TrackList(SIDE, false);

class Player extends NetworkWrapper(CollisionGroup(Entity, 'Player'),list, ["mouse", "name", "inventoryID", "spells", "walkSpeed", "maxStamina", "stamina", "staminaRate", "staminaCooldown", "dir"]) {
  constructor(opts){
    super(opts);
    const {spells = []} = opts;
    this.socketID = opts.socketID;
    this.name = opts.name;
    this.lastLeft = false;
    this.lastMiddle = false;
    this.lastRight = false;
    this.spells = spells;
    this.inventoryDirty = false;
    this.w = 40;
    this.h = 40;
    this.maxStamina = typeof opts.maxStamina != "undefined" ? opts.maxStamina : 100;
    this.staminaRate = typeof opts.staminaRate != "undefined" ? opts.staminaRate : 2;
    this.stamina = typeof opts.stamina != "undefined" ? opts.stamina : this.maxStamina;
    this.staminaCooldown = 0;
    this.dir = 0;

    if (SIDE == ConnectionManager.SERVER) {
      this.controls = connection.connections[this.socketID].controls;
        let inventory = new Inventory(opts.inventory?opts.inventory:{size: 27, hotbarSize: 9});
        this.inventoryID = inventory.netID;
    }
    if (SIDE == ConnectionManager.CLIENT) {
      this.mouse = opts.mouse;
      this.inventoryID = opts.inventoryID;
    }
    this.walkSpeed = 3;

    Player.nameMap[this.name] = this.netID;
    Player.socketMap[this.socketID] = this.netID;
  }

  get inventory(){
    return Inventory.list.get(this.inventoryID);
  }

  makeAction(amount){
    this.stamina = Math.max(0,this.stamina - amount);
    this.staminaCooldown = 100;
  }

  kill(killer){
    this.x = 0;
    this.y = 0;
    this.health = this.maxHealth;
    connection.server.io.to(this.socketID).emit('player-killed', {killer: killer.getInitPkt()});
  }

  useSpell(id, level){
    if (this.spells.includes(id)) Spell.sandbox[level == 'admin'?"runAdmin":"run"](Spell.list.get(id));
  }

  damage(amount, source){
    connection.server.send('player-damage', {amount, source: source.getInitPkt()}, this.socketID);
    super.damage(amount,source);
  }

  getSaveData(){
    let pack = this.getInitPkt();
    delete pack["inventoryID"];
    delete pack["spells"];
    pack.inventory = this.inventory.getInitPkt();
    return pack;
  }

  show(gc, world){
    if (world.netID != this.world.netID) return;
    // gc.fill(153, 0, 255);
    // gc.stroke(92, 0, 153);
    // gc.rect(this.x, this.y, this.w, this.h);
    // if (this.damageTime > 0) {
    //   gc.fill(255,0,0,(this.damageTime)/30);
    //   gc.noStroke();
    //   gc.rect(this.x, this.y, this.w, this.h);
    // }
    // gc.fill('black');
    // gc.noStroke();
    // gc.textAlign('center', 'bottom');
    // gc.text(this.name, this.x, this.y - this.h/2 - 20);
    // gc.fill(HEALTH_BG_COLOUR);
    // gc.stroke('grey');
    // gc.rect(this.x, this.y - this.h/2 - 10, 32, 5);
    // gc.fill(HEALTH_COLOUR);
    // gc.noStroke();
    // gc.cornerRect(this.x - 16, this.y - this.h/2 - 12.5, (this.health/this.maxHealth) * 32, 5);
    Sprite.get('player-standing').draw(gc, this.x, this.y, this.w, this.h, this.dir);
    if (this.damageTime > 0) Sprite.get('player-standing').drawAsMask(gc, 'rgba(255,0,0,' + this.damageTime / 30 + ')', this.x, this.y, this.w, this.h, this.dir);
  }

  update(pack){
    super.update(pack);
    switch(SIDE){
      case ConnectionManager.SERVER:
        if (!connection.connections[this.socketID]) return;
        this.inventoryDirty = this.inventory.isDirty();
        this.controls = connection.connections[this.socketID].controls;
        if (this.controls){
          // let mouse = this.controls.mouse;
          // this.hsp = (Number(this.controls.keys["D"]||0) - Number(this.controls.keys['A']||0)) * this.walkSpeed;
          // this.vsp = (Number(this.controls.keys["S"]||0) - Number(this.controls.keys['W']||0)) * this.walkSpeed;
          let mouse = this.controls.mouse;
          this.hsp *= 0.9;
          this.vsp *= 0.9;
          // console.log(this.hsp, this.vsp);
          let desX = (Number(this.controls.keys["D"]||0) - Number(this.controls.keys['A']||0));// * this.walkSpeed;
          let desY = (Number(this.controls.keys["S"]||0) - Number(this.controls.keys['W']||0));// * this.walkSpeed;
          // console.log(this.hsp, this.vsp);
          let mag = Math.sqrt((desX * desX) + (desY * desY));
          // console.log(mag);
          if (mag > 1) {
            desX /= mag > 0 ? mag : 1;
            desY /= mag > 0 ? mag : 1;
          }
          this.hsp += desX;
          this.vsp += desY;
          mag = Math.sqrt((this.hsp * this.hsp) + (this.vsp * this.vsp));
          if (mag > this.walkSpeed) {
            this.hsp /= mag;
            this.vsp /= mag;
          }
          if (this.hsp || this.vsp) this.dir = Math.atan2(this.vsp, this.hsp);
          if (mouse.right == true && this.lastRight == false){
            console.log(mouse.x, mouse.y);
            let buildings = this.world.collisionTree.query(new Point(mouse.x, mouse.y), ['Building']).getGroup('found');
            if (buildings.length > 0) {
              buildings[0].use(this);
            }
          }
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
          if (this.controls.keysReleased["E"]||false) {
            console.log("E Pressed");
            let skt = connection.connections[this.socketID].socket;
            if (GUI.list["player-inventory"].isOpenForSocket(skt)) {
              GUI.list["player-inventory"].close(skt);
            } else {
              GUI.list["player-inventory"].open(skt, this);
            }
          }
          if (this.controls.keysReleased["ESCAPE"]||false) {
            console.log("ESC pressed");
            GUI.closeAllOnSocket(connection.connections[this.socketID].socket)
          }
          if (this.staminaCooldown <= 0) {
            if (this.stamina < this.maxStamina) this.stamina = Math.min(this.stamina + this.staminaRate, this.maxStamina);
          } else {
            this.staminaCooldown --;
          }
        }
        break;

      // case ConnectionManager.CLIENT:
      //   super.update(pack);
      //   this.mouse = pack.mouse;
      //   this.name = pack.name;
      //   this.inventoryID = pack.inventoryID;
      //   this.spells = pack.spells;
      //   break;
    }
  }

  // getUpdatePkt(){
  //   let pack = super.getUpdatePkt();
  //   if (this.controls) {pack.mouse = {x: this.controls.mouse.x, y: this.controls.mouse.y};} else {pack.mouse = {x: 0, y: 0}}
  //   pack.inventoryID = this.inventoryID;
  //   pack.name = this.name;
  //   pack.spells = this.spells;
  //   return pack;
  // }

  // getInitPkt(){
  //   let pack = super.getInitPkt();
  //   pack.mouse = {x: 0, y: 0};
  //   pack.inventoryID = this.inventoryID;
  //   pack.name = this.name;
  //   pack.spells = this.spells;
  //   return pack;
  // }

  drawNamePlate(gc,world) {
    if (world.netID != this.world.netID) return;

    gc.noStroke();
    gc.font('14px Arial');
    gc.textAlign('center', 'bottom');
    let textM = gc.ctx.measureText(this.name);
    gc.fill(0,0,0,0.5);
    gc.rect(this.x, this.y - this.h/2 - 27, textM.width + 10, 20)
    gc.fill('white')

    gc.text(this.name, this.x, this.y - this.h/2 - 20);

    gc.fill(HEALTH_BG_COLOUR);
    gc.stroke('grey');
    gc.rect(this.x, this.y - this.h/2 - 10, 32, 5);
    gc.fill(HEALTH_COLOUR);
    gc.noStroke();
    gc.cornerRect(this.x - 16, this.y - this.h/2 - 12.5, (this.health/this.maxHealth) * 32, 5);
  }

  remove(){
    delete Player.nameMap[this.name];
    delete Player.socketMap[this.socketID];
    if (SIDE == ConnectionManager.SERVER) this.inventory.remove();
    // for (let id in this.spells) {
    //   Spell.list.get(id).save(this.name);
    // }
    super.remove();
  }

  static getPermissions(playername) {
    return Player.permissions[playername] || Player.DEFAULT_PERMISSIONS;
  }

  static getByName(name){
    return Player.nameMap[name]?Player.list.get(Player.nameMap[name]):null;
  }

  static getBySocket(socket){
    return Player.socketMap[socket.id]?Player.list.get(Player.socketMap[socket.id]):null;
  }

  static getSaveData(){
    return this.list.getIds().map(e=>this.list.get(e).getSaveData()).reduce((acc,e)=>{acc[e.name] = e; return acc}, {});
  }
}

Player.nameMap = {};

Player.socketMap = {};

Player.permissions = {};

Player.DEFAULT_PERMISSIONS = "none";

list.setType(Player);

Player.list = list;

module.exports = Player;
