const {Rectangle, CollisionGroup, ConnectionManager, NetworkWrapper, TrackList, QueryResult, Line} = require('electron-game-util');
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
    this.state = 'wander';
  }

  show(gc){
    switch(this.state){
      case 'wander':
        gc.fill(230, 230, 230);
        gc.stroke(128, 128, 128);
        break;
      case 'follow':
        gc.fill(230, 0, 0);
        gc.stroke(128, 0, 0);
        (new Line(this, Player.list.get(this.targetID))).show(gc);
        break;
      case 'search':
        gc.fill(0, 0, 230);
        gc.stroke(0, 0, 128);
        break;
    }
    gc.rect(this.x, this.y, this.w, this.h);
    gc.fill('red');
    gc.stroke('grey');
    gc.rect(this.x, this.y - this.h/2 - 10, 32, 5);
    gc.fill('green');
    gc.noStroke();
    gc.cornerRect(this.x - 16, this.y - this.h/2 - 12.5, (this.health/this.maxHealth) * 32, 5);
  }

  update(pack){
    switch(SIDE){
      case ConnectionManager.SERVER:
        let near;
        switch(this.state){
          case "wander":
            if (this.cooldown <= 0) {
              if (this.hsp || this.vsp){
                this.hsp = 0;
                this.vsp = 0;
                this.cooldown = Math.floor(Math.random() * 3 + 1) * 60;
              } else {
                this.hsp = Math.floor(Math.random() * 3) - 1;
                this.vsp = Math.floor(Math.random() * 3) - 1;
                this.cooldown = Math.floor(Math.random() * 3 + 1) * 60;
              }
            }
            near = this.nearest(this.x, this.y, false, this.maxRange, 'Player');
            if (near) {
              //console.log('Found Player');
              let path = new Line(this, near);
              let res = this.world.collisionTree.query(path, ['Wall']);
              if (res.status == QueryResult.NONE){
                //console.log('No intersections');
                this.targetID = near.netID;
                this.state = 'follow';
              }
            }
            break;
          case 'follow':
            if (this.targetID && Player.list.get(this.targetID) && Player.list.get(this.targetID).health > 0){
              //console.log('Following...');
              let target = Player.list.get(this.targetID);
              if (this.cooldown <= 0){
                let p = this.collision(this.x, this.y, false, 'Player')
                if (p){
                  p.damage(this.attackDamage, this);
                  this.cooldown = 180;
                }
              }
              let path = new Line(this, target);
              let res = this.world.collisionTree.query(path, ['Wall']);
              if (res.status == QueryResult.NONE){
                let xdir = Math.sign(target.x - this.x);
                let ydir = Math.sign(target.y - this.y);

                this.hsp = xdir * this.walkSpeed;
                this.vsp = ydir * this.walkSpeed;
              } else {
                this.cooldown = 240;
                this.state = 'search';
              }
            } else {
              this.state = 'wander';
            }
            break;
          case 'search':
            near = this.nearest(this.x, this.y, false, this.maxRange, 'Player');
            if (this.cooldown <= 0) this.state = 'wander';
            if (near) {
              //console.log('Found Player');
              let path = new Line(this, near);
              let res = this.world.collisionTree.query(path, ['Wall']);
              if (res.status == QueryResult.NONE){
                //console.log('No intersections');
                this.targetID = near.netID;
                this.state = 'follow';
              }
            }
            break;
        }
        if (this.cooldown > 0) this.cooldown --;
        // if (this.targetID && Player.list.get(this.targetID) && Player.list.get(this.targetID).health > 0){
        //   let target = Player.list.get(this.targetID);
        //
        //   let xdir = Math.sign(target.x - this.x);
        //   let ydir = Math.sign(target.y - this.y);
        //
        //   this.hsp = xdir * this.walkSpeed;
        //   this.vsp = ydir * this.walkSpeed;
        //   if (this.cooldown <= 0){
        //     let p = this.collision(this.x, this.y, false, 'Player')
        //     if (p){
        //       p.damage(this.attackDamage, this);
        //       this.cooldown = 180;
        //     }
        //   }
        // } else {
        //   if (this.cooldown <= 0){
        //     let res = this.nearest(this.x, this.y, false, this.maxRange, 'Player');
        //     if (res) {this.targetID = res.netID;} else {
        //       this.cooldown = 300;
        //     }
        //   }
        //   this.hsp = 0;
        //   this.vsp = 0;
        // }
        // if (this.cooldown > 0) {
        //  this.cooldown = Math.max(this.cooldown - 1, 0);
        // }

        super.update()
        break;

      case ConnectionManager.CLIENT:
        super.update(pack);
        this.attackDamage = pack.attackDamage;
        this.state = pack.state;
        this.targetID = pack.targetID;
        break;
    }
  }

  getUpdatePkt(){
    let pack = super.getUpdatePkt();
    pack.attackDamage = this.attackDamage;
    pack.state = this.state;
    pack.targetID = this.targetID;
    return pack;
  }

  getInitPkt(){
    let pack = super.getUpdatePkt();
    pack.attackDamage = this.attackDamage;
    pack.state = this.state;
    pack.targetID = this.targetID;
    return pack;
  }

  remove(){
    super.remove();
  }
}

list.setType(Enemy);

Enemy.list = list;

module.exports = Enemy;
