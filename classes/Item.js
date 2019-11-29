const {Rectangle, CollisionGroup, ConnectionManager, NetworkWrapper, TrackList} = require('electron-game-util');
const Entity = require('./Entity.js');
const Player = require('./Player.js');
const lang = require('../lang.json').item;

let list = new TrackList(SIDE, false, false);

class Item extends NetworkWrapper(Object, list) {
  constructor(name, sprite = ('item-' + name), maxStack = 99){
    super({netID: name});
    this.name = name;
    this.sprite = sprite;
    this.maxStack = maxStack;
    Item.map.set(this.name, this.netID);
  }

  use(stack, player){
    return false;
  }

  attack(stack, player){
    return false;
  }

  getTooltip(stack){
    if (stack.data.getKey("display")) {
      let name = stack.data.getKey("display").getKey("name");
      let lore = stack.data.getKey("display").getKey("lore");
      return name + "<br/><span style='color:darkgray;'>" + Array.from(lore).join("<br/>") + "</span>";
    } else {
      return lang[this.name];
    }
  }

  static use(stack, player){
    Item.list.get(stack.type).use(stack, player);
  }

  static attack(stack, player){
    Item.list.get(stack.type).attack(stack, player);
  }

  static get(name){
    let id = Item.map.get(name);
    if (!id) return null;
    return Item.list.get(id);
  }

  static idExists(name) {
    return Item.map.has(name);
  }
}

list.setType(Item);

Item.list = list;
Item.map = new Map();

module.exports = Item;
