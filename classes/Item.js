const {Rectangle, CollisionGroup, ConnectionManager, NetworkWrapper, TrackList} = require('electron-game-util');
const Entity = require('./Entity.js');
const Player = require('./Player.js');

let list = new TrackList(SIDE, false);

class Item extends NetworkWrapper(Object, list) {
  constructor(name, sprite = ('item-' + name), maxStack = 99){
    super({netID: name});
    this.name = name;
    this.sprite = sprite;
    this.maxStack = maxStack;
  }

  use(stack, player){
    return false;
  }

  attack(stack, player){
    return false;
  }

  static use(stack, player){
    Item.list.get(stack.type).use(stack, player);
  }

  static attack(stack, player){
    Item.list.get(stack.type).attack(stack, player);
  }
}

list.setType(Item);

Item.list = list;

module.exports = Item;
