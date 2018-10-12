const {Rectangle, CollisionGroup, ConnectionManager, NetworkWrapper, TrackList} = require('electron-game-util');
const Entity = require('./Entity.js');
const ItemEntity = require('./ItemEntity.js');
const Item = require('./Item.js');
const ItemStack = require('./ItemStack.js');

let list = new TrackList(SIDE);

class Inventory extends NetworkWrapper(Object, list) {
  constructor(opts = {}) {
    let {size = 1,hotbarSize = 0, list = [], hotbar = [], selectedSlot = 0} = opts;
    super(opts);
    this.size = size;
    this.hotbarSize = hotbarSize;
    this.totalSize = size + hotbarSize;
    this.list = [];
    this.hotbar = [];
    this.clear();
    for(let i in list){
      this.list[i] = list[i];
    }
    for(let i in hotbar){
      this.hotbar[i] = hotbar[i];
    }
    this.selectedSlot = selectedSlot;
  }

  get selected(){
    return this.hotbar[this.selectedSlot];
  }

  getUpdatePkt(){
    let pack = super.getUpdatePkt();
    pack.list = this.list;
    pack.hotbar = this.hotbar;
    pack.selectedSlot = this.selectedSlot;
    return pack;
  }

  getInitPkt(){
    let pack = super.getInitPkt();
    pack.size = this.size;
    pack.hotbarSize = this.hotbarSize;
    pack.list = this.list;
    pack.hotbar = this.hotbar;
    pack.selectedSlot = this.selectedSlot;
    return pack;
  }

  update(pack){
    if (SIDE == ConnectionManager.CLIENT){
      super.update(pack);
      this.list = pack.list;
      this.hotbar = pack.hotbar;
      this.selectedSlot = pack.selectedSlot;
    }
  }

  drop(from,slot,amount=Infinity,x = 0,y = 0){
    // let type = this[from][slot].type;
    // if (type == null) return 0;
    // let count = Math.min(this[from][slot].count,amount);
    // if (count == 0) return 0;
    // this[from][slot].count -= count;
    // if(this[from][slot].count <= 0) this[from][slot].type = null;
    // new ItemEntity({type: type,count,x,y,pickupDelay:100});
    // return count;
    let item = this[from][slot].split(amount<this[from][slot].count?amount:this[from][slot].count);
    if (this[from][slot].count <= 0) this[from][slot] = null;
    new ItemEntity({x,y,pickupDelay: 100, ...item});
    return item.count;
  }

  removeItemEntity(from,slot,amount){
    if (from == 'any'){
      let int = this.getFirst(slot);
      slot = int.slot;
      from = int.from;
      if (slot <= -1) return;
    }
    let type = this[{'hotbar':'hotbar','inventory': 'list'}[from]][slot].type;
    if (type == null) return 0;
    let count = Math.min(this[from][slot].count,amount);
    if (count == 0) return 0;
    this[from][slot].count -= count;
    if(this[from][slot].count <= 0) this[from][slot].type = null;
    return count;
  }

  getFirst(type, from = 'any'){
    switch(from){
      case 'inventory':
        return this.list.findIndex((item)=>{
          return item.type == type;
        })
        break;

      case 'hotbar':
        return this.hotbar.findIndex((item)=>{
          return item.type == type;
        })
        break;

      case 'any':
        let i = this.hotbar.findIndex((item)=>{
          return item.type == type;
        })

        if (i > -1) return {slot: i, from: 'hotbar'};

        return {slot: this.list.findIndex((item)=>{
          return item.type == type;
        }), from: 'inventory'};
    }
  }

  add(type,amount,to = 'any',slot){
    let total = amount;
    if (amount == 0){console.log('Error in amount');return 0;}
    if(type == null) {console.log('Error in type');return 0;}
    if(!['any','hotbar','inventory'].includes(to)) {console.log('Error in to');return 0;}
    let item = Item.get(type);
    if (!item) throw new Error("Inventory: Attempted to add invalid item of type " + type + " to the inventory.");
    let maxStack = item.maxStack;
    switch(to){
      case 'any':
        for(let i = 0; i < this.hotbarSize; i ++){
          if(this.hotbar[i] && (this.hotbar[i].count > maxStack || this.hotbar[i].type != type)) continue;
          if (!this.hotbar[i]) this.hotbar[i] = new ItemStack(type, 0);
          let item = this.hotbar[i];
          amount -= item.add(amount);
          if (amount <= 0) break;
        }
        if (amount <= 0) return total;
        for (let i = 0; i < this.size; i ++){
          if(this.list[i] && (this.list[i].count > maxStack || this.list[i].type != type)) continue;
          if (!this.list[i]) this.list[i] = new ItemStack(type, 0);
          let item = this.list[i];
          amount -= item.add(amount);
          if (amount <= 0) break;
        }
        if (amount <= 0) return total;
        return total - amount;
        break;

      case 'hotbar':
        if(typeof slot != 'undefined'){
          if(this.hotbar[slot] && (this.hotbar[slot].count > maxStack || this.hotbar[slot].type != type)) return 0;
          if (!this.hotbar[slot]) this.hotbar[slot] = new ItemStack(type, 0);
          let item = this.hotbar[slot];
          amount -= item.add(amount);
          return total - amount;
        }
        for(let i = 0; i < this.hotbarSize; i ++){
          if(this.hotbar[i] && (this.hotbar[i].count > maxStack || this.hotbar[i].type != type)) continue;
          if(!this.hotbar[i]) this.hotbar[i] = new ItemStack(type, 0);
          let item = this.hotbar[i];
          amount -= item.add(amount);
          if (amount <= 0) break;
        }
        if (amount <= 0) return total;
        return total - amount;
        break;

      case 'inventory':
        if(typeof slot != 'undefined'){
          if(this.list[slot] && (this.list[slot].count > maxStack || this.list[slot].type != type)) return 0;
          if(!this.list[slot]) this.list[slot] = new ItemStack(type, 0);
          let item = this.list[slot];
          amount -= item.add(amount);
          return total - amount;
        }
        for (let i = 0; i < this.size; i ++){
          if(this.list[i] && (this.list[i].count > maxStack || this.list[i].type != type)) continue;
          if(!this.list[i]) this.list[i] = new ItemStack(type, 0);
          let item = this.list[i];
          amount -= item.add(amount);
          if (amount <= 0) break;
        }
        if (amount <= 0) return total;
        return total - amount;
        break;
    }
  }

  set(to,slot,amount,type){
    if(!['hotbar','inventory'].includes(to) || slot > this[to=='inventory'?'list':to].length-1) return false;
    // this[to=='inventory'?'list':to][slot] = {type: type?type:this[to=='inventory'?'list':to][slot].type, count: Math.min(99,Math.max(0,amount))};
    if (type) {

      this[to=='inventory'?'list':to][slot] = new ItemStack(type, amount);
    } else {
      this[to=='inventory'?'list':to][slot].set(amount);
    }
    return true;
  }

  clear(){
    for (let i = 0; i < this.size;i++){
      this.list[i] = null;
    }
    for (let i = 0; i < this.hotbarSize;i++){
      this.hotbar[i] = null;
    }
  }
}

list.setType(Inventory);

Inventory.list = list;

module.exports = Inventory;
