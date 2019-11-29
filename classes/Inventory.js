const {Rectangle, CollisionGroup, ConnectionManager, NetworkWrapper, TrackList} = require('electron-game-util');
const Entity = require('./Entity.js');
const ItemEntity = require('./ItemEntity.js');
const Item = require('./Item.js');
const ItemStack = require('./ItemStack.js');
const ItemData = require('./ItemData.js');

let list = new TrackList(SIDE, false);

class Inventory extends NetworkWrapper(Object, list, ["*list", "*hotbar", "selectedSlot", "size", "hotbarSize"]) {
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
      this.list[i] = list[i]?new ItemStack(list[i]):list[i];
    }
    for(let i in hotbar){
      this.hotbar[i] = hotbar[i]?new ItemStack(hotbar[i]):hotbar[i];
    }
    this.selectedSlot = selectedSlot;
    this.deepDirty = false;
  }

  get selected(){
    return this.hotbar[this.selectedSlot];
  }

  deserialise(prop, val) {
    switch (prop) {
      case "list":
      case "hotbar":
        console.log("Inv Update");
        return val.map(e=>e?new ItemStack(e):e);
        break;
      default:
        return val;
    }
  }

  update(pack) {
    super.update(pack);
    if (SIDE == ConnectionManager.SERVER) {
      if (this.list.some(e=>e?e.isDirty():false)) {
        this.dirtyProps['list'] = true;
        this.deepDirty = true;
      }
      if (this.hotbar.some(e=>e?e.isDirty():false)) {
        this.dirtyProps['hotbar'] = true;
        this.deepDirty = true;
      }
    }
  }

  isDirty(){
    if (this.deepDirty || super.isDirty()) {
      this.deepDirty = false;
      return true;
    }
    return false;
  }

  // getUpdatePkt(){
  //   let pack = super.getUpdatePkt();
  //   pack.list = this.list;
  //   pack.hotbar = this.hotbar;
  //   pack.selectedSlot = this.selectedSlot;
  //   return pack;
  // }

  // getInitPkt(){
  //   let pack = super.getInitPkt();
  //   pack.size = this.size;
  //   pack.hotbarSize = this.hotbarSize;
  //   pack.list = this.list;
  //   pack.hotbar = this.hotbar;
  //   pack.selectedSlot = this.selectedSlot;
  //   return pack;
  // }

  // update(pack){
  //   if (SIDE == ConnectionManager.CLIENT){
  //     super.update(pack);
  //     this.list = pack.list;
  //     this.hotbar = pack.hotbar;
  //     this.selectedSlot = pack.selectedSlot;
  //   }
  // }

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
    this.dirtyProps[from] = true;
    return item.count;
  }

  removeItemEntity(from,slot,amount){
    if (from == 'any'){
      let int = this.getFirst(slot);
      slot = int.slot;
      from = {'hotbar':'hotbar','inventory': 'list'}[int.from];
      if (slot <= -1) return;
    }
    let type = this[from][slot].type;
    if (type == null) return 0;
    let count = Math.min(this[from][slot].count,amount);
    if (count == 0) return 0;
    this[from][slot].count -= count;
    if(this[from][slot].count <= 0) this[from][slot].type = null;
    this.dirtyProps[from] = true;
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

  add(type,amount,data = new ItemData(),to = 'any',slot){
    let total = amount;
    let dataString = JSON.stringify(data);
    if (amount == 0){console.log('Error in amount');return 0;}
    if(type == null) {console.log('Error in type');return 0;}
    if(!['any','hotbar','inventory'].includes(to)) {console.log('Error in to');return 0;}
    let item = Item.get(type);
    if (!item) throw new Error("Inventory: Attempted to add invalid item of type " + type + " to the inventory.");
    let maxStack = item.maxStack;
    switch(to){
      case 'any':
        for(let i = 0; i < this.hotbarSize; i ++){
          if(this.hotbar[i] && (this.hotbar[i].count > maxStack || this.hotbar[i].type != type || JSON.stringify(this.hotbar[i].data) != dataString)) continue;
          if (!this.hotbar[i]) this.hotbar[i] = new ItemStack(type, 0, dataString);
          let item = this.hotbar[i];
          amount -= item.add(amount);
          this.dirtyProps["hotbar"] = true;
          if (amount <= 0) break;
        }
        if (amount <= 0) {
          return total;
        }
        for (let i = 0; i < this.size; i ++){
          if(this.list[i] && (this.list[i].count > maxStack || this.list[i].type != type || JSON.stringify(this.list[i].data) != dataString)) continue;
          if (!this.list[i]) this.list[i] = new ItemStack(type, 0, dataString);
          let item = this.list[i];
          amount -= item.add(amount);
          this.dirtyProps["list"] = true;
          if (amount <= 0) break;
        }
        if (amount <= 0) {
          return total;
        }
        this.dirtyProps["list"] = true;
        this.dirtyProps["hotbar"] = true;
        return total - amount;
        break;

      case 'hotbar':
        if(typeof slot != 'undefined'){
          if(this.hotbar[slot] && (this.hotbar[slot].count > maxStack || this.hotbar[slot].type != type || JSON.stringify(this.hotbar[slot].data) != dataString)) return 0;
          if (!this.hotbar[slot]) this.hotbar[slot] = new ItemStack(type, 0, dataString);
          let item = this.hotbar[slot];
          amount -= item.add(amount);
          this.dirtyProps["hotbar"] = true;
          return total - amount;
        }
        for(let i = 0; i < this.hotbarSize; i ++){
          if(this.hotbar[i] && (this.hotbar[i].count > maxStack || this.hotbar[i].type != type || JSON.stringify(this.hotbar[i].data) != dataString)) continue;
          if(!this.hotbar[i]) this.hotbar[i] = new ItemStack(type, 0, dataString);
          let item = this.hotbar[i];
          amount -= item.add(amount);
          this.dirtyProps["hotbar"] = true;
          if (amount <= 0) break;
        }
        if (amount <= 0) {
          return total;
        }
        this.dirtyProps["hotbar"] = true;
        return total - amount;
        break;

      case 'inventory':
        if(typeof slot != 'undefined'){
          if(this.list[slot] && (this.list[slot].count > maxStack || this.list[slot].type != type || JSON.stringify(this.list[slot].data) != dataString)) return 0;
          if(!this.list[slot]) this.list[slot] = new ItemStack(type, 0, dataString);
          let item = this.list[slot];
          amount -= item.add(amount);
          this.dirtyProps["list"] = true;
          return total - amount;
        }
        for (let i = 0; i < this.size; i ++){
          if(this.list[i] && (this.list[i].count > maxStack || this.list[i].type != type || JSON.stringify(this.list[i].data) != dataString)) continue;
          if(!this.list[i]) this.list[i] = new ItemStack(type, 0, dataString);
          let item = this.list[i];
          amount -= item.add(amount);
          this.dirtyProps["list"] = true;
          if (amount <= 0) break;
        }
        if (amount <= 0) {
          return total;
        }
        this.dirtyProps["list"] = true;
        return total - amount;
        break;
    }
  }

  get(to, slot) {
    if((!['hotbar','inventory'].includes(to)) || slot > this[to=='inventory'?'list':to].length-1) return false;
    return this[to=='inventory'?'list':to][slot];
  }

  set(to,slot,amount,type,data){
    if(!['hotbar','inventory'].includes(to) || slot > this[to=='inventory'?'list':to].length-1) return false;
    // this[to=='inventory'?'list':to][slot] = {type: type?type:this[to=='inventory'?'list':to][slot].type, count: Math.min(99,Math.max(0,amount))};
    if (type) {

      this[to=='inventory'?'list':to][slot] = new ItemStack(type, amount, JSON.stringify(data));
    } else {
      this[to=='inventory'?'list':to][slot].set(amount);
    }
    this.dirtyProps[to=='inventory'?'list':to] = true;
    return true;
  }

  clear(from, slot){
    if (from !== undefined && from !== null && slot !== undefined && slot !== null) {
      this[from=='inventory'?'list':from][slot] = null;
      this.dirtyProps[from=='inventory'?'list':from] = true;
    } else {
      for (let i = 0; i < this.size;i++){
        this.list[i] = null;
      }
      for (let i = 0; i < this.hotbarSize;i++){
        this.hotbar[i] = null;
      }
      this.dirtyProps["list"] = true;
      this.dirtyProps["hotbar"] = true;
    }

  }
}

list.setType(Inventory);

Inventory.list = list;

module.exports = Inventory;
