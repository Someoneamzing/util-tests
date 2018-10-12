const {QueryResult, Circle} = require('electron-game-util');

const Item = require('./classes/Item.js');

let stone = new Item('stone');
let gold = new Item('gold');
let sword = new Item('sword');
sword.attack = (stack, player)=>{

  let res = player.world.collisionTree.query(new Circle(player.x, player.y, 40),['Player','Enemy']);
  if (res.status == QueryResult.OK){
    for(let e of res.getGroup('found')){
      if (e.netID != player.netID){
        e.damage(5, player);
      }
    }
  }
}

let spell = new Item('spell');
spell.attack = (stack, player)=>{
  
}
spell.use = spell.attack;
