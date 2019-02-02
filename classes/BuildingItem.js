const Item = require('./Item.js');

class BuildingItem extends Item {
  constructor(BuildingClass){
    super(BuildingClass.registryName);
  }

  use(stack, player) {
    new BuildingClass({x: player.controls.mouse.x, y: player.controls.mouse.y});
  }
}
