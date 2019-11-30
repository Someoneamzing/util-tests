const Item = require('./Item.js');

class BuildingItem extends Item {
  constructor(BuildingClass){
    super(BuildingClass.registryName);
    this.buildClass = BuildingClass;
  }

  use(stack, player) {
    new this.buildClass({x: player.controls.mouse.x, y: player.controls.mouse.y});
    stack.remove(1);
  }
}

module.exports = BuildingItem;
