const {Rectangle, CollisionGroup, ConnectionManager, NetworkWrapper, TrackList} = require('electron-game-util');
const Entity = require('./Entity.js');

let list = new TrackList(SIDE);

class Player extends NetworkWrapper(CollisionGroup(Entity, 'Player'),list) {
  constructor(opts){
    super(opts);
    this.socketID = opts.socketID;
    if (SIDE == ConnectionManager.SERVER) this.controls = connection.connections[this.socketID].controls;
    if (SIDE == ConnectionManager.CLIENT) this.mouse = opts.mouse;
    this.walkSpeed = 3;
  }

  show(gc){
    gc.fill(153, 0, 255);
    gc.stroke(92, 0, 153);
    gc.rect(this.x, this.y, this.w, this.h);
    gc.fill(0,204,102);
    gc.stroke(0,128,64);
    gc.circle(this.mouse.x, this.mouse.y, 3)
  }

  update(pack){
    switch(SIDE){
      case ConnectionManager.SERVER:
        //console.log("Update for Player called from: " + pack);
        this.controls = connection.connections[this.socketID].controls;
        // console.log(this.controls.keys["W"],this.controls.keys["A"],this.controls.keys["S"],this.controls.keys["D"]);
        if (this.controls){
          this.hsp = (Number(this.controls.keys["D"]||0) - Number(this.controls.keys['A']||0)) * this.walkSpeed;
          this.vsp = (Number(this.controls.keys["S"]||0) - Number(this.controls.keys['W']||0)) * this.walkSpeed;
        }

        super.update()
        break;

      case ConnectionManager.CLIENT:
        super.update(pack);
        this.mouse = pack.mouse;
        break;
    }
  }

  getUpdatePkt(){
    let pack = super.getUpdatePkt();
    if (this.controls) {pack.mouse = {x: this.controls.mouse.x, y: this.controls.mouse.y};} else {pack.mouse = {x: 0, y: 0}}
    return pack;
  }

  getInitPkt(){
    let pack = super.getInitPkt();
    pack.mouse = {x: 0, y: 0};
    return pack;
  }

  remove(){
    super.remove();
    console.log("Removing Player");
  }
}

list.setType(Player);

Player.list = list;

module.exports = Player;
