const {QueryResult, Circle, Vector} = require('electron-game-util');
const Spell = require('./classes/Spell.js')

const Item = require('./classes/Item.js');
const Arrow = require('./classes/Arrow.js');
const BuildingItem = require('./classes/BuildingItem.js');

let stone = new Item('stone');
let gold = new Item('gold');

let arrow = new Item('arrow');
let bow = new Item('bow');
bow.use = (stack, player)=>{
  let arrows = player.inventory.getFirst('arrow');
  if (arrows.slot != -1) {
    console.log('Fired arrow');
    let aStack = player.inventory[arrows.from][arrows.slot]
    let removed = aStack.remove(1);
    let mouse = player.controls.mouse;
    console.log(removed);

    if (removed > 0) {
      let dir = new Vector(mouse.x, mouse.y).sub(player.x, player.y).norm().mult(8)
      new Arrow({x: player.x, y: player.y, hsp: dir.x, vsp: dir.y, owner: player.netID, power: 3})
    }
  }
}

let sword = new Item('sword');
sword.attack = (stack, player)=>{

  let res = player.world.collisionTree.query(new Circle(player.x, player.y, 40),['Player','Enemy']);
  if (res.status == QueryResult.OK && player.stamina >= 10){
    player.makeAction(10);
    for(let e of res.getGroup('found')){
      if (e.netID != player.netID){
        e.damage(5, player);
      }
    }
  }
}

let spell = new Item('spell');
spell.attack = (stack, player)=>{
  let id = stack.data.spell;
  console.log(id);
  let spell = Spell.list.get(id);
  Spell.sandbox.run(spell);
}
spell.use = spell.attack;
