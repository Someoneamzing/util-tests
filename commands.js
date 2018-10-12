const Command = require('./classes/Command.js');
const Wall = require('./classes/Wall.js');
const Enemy = require('./classes/Enemy.js');
const ItemEntity = require('./classes/ItemEntity.js');
const Teleporter = require('./classes/Teleporter.js');
const {jsParser} = require('./classes/Syntax.js');

let tp = new Command('tp', true, {type: "number", name: "x"}, {type: "number", name: "y"});
tp.setHandle((args,p)=>{
  p.x = args.x;
  p.y = args.y;
  return "Teleported to " + args.x + ", " + args.y + "."
})

let give = new Command('give', true, {type: "string", name: "type"}, {type: "number", name: "amount"});
give.setHandle((args, p)=>{
  p.inventory.add(args.type, args.amount);
  return "Gave " + args.amount + " of " + args.type + "."
})

let heal = new Command('heal', true);
heal.setHandle((args, p)=>{
  p.health = p.maxHealth;
  return "Healed to max HP."
})

let summon = new Command('summon', true, {type: "string", name: "type", values: ["Wall", "Enemy", "Item", "Teleporter"]}, {type: "JSON", name: "data"});
summon.setHandle((args, p)=>{
  switch (args.type) {
    case "Wall":
      new Wall(args.data);
      break;
    case "Enemy":
      new Enemy(args.data);
      break;
    case "Item":
      new ItemEntity(args.data);
      break;
    case "Teleporter":
      new Teleporter(args.data);
      break;
  }
})

let code = new Command('code', false, {type: "string", name: "text"});
code.setHandle((args, p)=>{
  let res = jsParser.parse(args.text);
  console.log(res);
  connection.server.send("chat-msg", {who: p.name, text: "<div type='text/javascript' class='code'>" + res + "</div>", type: "chat"})
})

let whisper = new Command('whisper', false, {type: "string", name: "text"});
whisper.setHandle((args, p)=>{
  let name = args.text.split(" ")[0];
  let player = Player.getByName(name);
  if (!player) return "<span style='color: red;'>" + name + " is not currently online.</span>"
  connection.connections[player.socketID].socket.emit("chat-msg", {type: "whisper", who: p.name, text: args.text.slice(args.text.indexOf(' '))});
})
