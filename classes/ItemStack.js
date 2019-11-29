const ItemEntity = require('./ItemEntity.js');
const ItemData = require('./ItemData.js');
const Item = require('./Item.js');
const World = require('./World.js');
const Inventory = require('./Inventory.js');


class ItemStack {
  constructor(_type, _count, _data = {}){
    let {type, count, data = {}} = ((typeof _type == 'object')?_type:({type:_type,count:_count,data:_data}));
    if (!Item.get(type)) throw new Error("ItemStack: Attempted to make an invalid ItemStack of type " + type);
    this.type = type;
    this.count = count;
    this.data = new ItemData(data);
    this.dirty = false;
  }

  isDirty(){
    if (this.dirty || this.data.isDirty()) {
      this.dirty = false;
      return true;
    }
    return false;
  }

  add(amount){
    let toAdd = Math.min(Item.get(this.type).maxStack - this.count, amount);
    this.count += toAdd;
    this.dirty = true;
    return toAdd;
  }

  remove(amount){
    let toRemove = Math.min(amount, this.count);
    this.count -= toRemove;
    this.dirty = true;
    return toRemove;
  }

  set(amount){
    this.dirty = true;
    this.count = Math.max(0, Math.min(Item.get(this.type).maxStack, amount));
  }

  split(amount){
    if (amount > this.count) throw new Error("ItemStack: Attempted to split stack by larger number.");
    this.dirty = true;
    this.count -= amount;
    return new ItemStack(this.type, amount, JSON.stringify(this.data));
  }
}

module.exports = ItemStack;
