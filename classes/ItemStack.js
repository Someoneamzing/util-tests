const ItemEntity = require('./ItemEntity.js');
const Item = require('./Item.js');
const World = require('./World.js');
const Inventory = require('./Inventory.js');

class ItemStack {
  constructor(type, count, data){
    if (!Item.get(type)) throw new Error("ItemStack: Attempted to make an invalid ItemStack of type " + type);
    this.type = type;
    this.count = count;
    this.data = data;
  }

  add(amount){
    let toAdd = Math.min(Item.get(this.type).maxStack - this.count, amount);
    this.count += toAdd;
    return toAdd;
  }

  remove(amount){
    let toRemove = Math.min(amount, this.count);
    this.count -= toRemove;
    return toRemove;
  }

  set(amount){
    this.count = Math.max(Item.get(this.type).maxStack, Math.min(0, amount));
  }

  split(amount){
    if (amount >= this.count) throw new Error("ItemStack: Attempted to split stack by larger number.");
    this.count -= amount;
    return new ItemStack(this.type, amount, JSON.parse(JSON.stringify(this.data)));
  }
}

module.exports = ItemStack;
