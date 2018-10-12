const {ipcRenderer} = require('electron');
require('./config.js');
const uuid = require('uuidv4');

const {Server, ConnectionManager, TrackList, NetworkWrapper, Rectangle, GameLoop, Line, Point} = require('electron-game-util');
global.SIDE = ConnectionManager.SERVER;

const Entity = require('./classes/Entity.js');
const Wall = require('./classes/Wall.js');
const Player = require('./classes/Player.js');
const World = require('./classes/World.js');
const Enemy = require('./classes/Enemy.js');
const Inventory = require('./classes/Inventory.js');
const ItemEntity = require('./classes/ItemEntity.js');
const Teleporter = require('./classes/Teleporter.js');
const Command = require('./classes/Command.js');
const Spell = require('./classes/Spell.js');

let server = new Server(2000);
let loop = new GameLoop('main', 1000/60);

global.connection = new ConnectionManager(SIDE, server);

connection.addTrackList(Entity.list);
connection.addTrackList(Wall.list);
connection.addTrackList(Player.list);
connection.addTrackList(World.list);
connection.addTrackList(Enemy.list);
connection.addTrackList(Inventory.list);
connection.addTrackList(ItemEntity.list);
connection.addTrackList(Teleporter.list);
connection.addTrackList(Spell.list);

require('./items.js');
require('./commands.js');

window.onload = ()=>{
  console.log("Document Loaded");

  document.getElementById('client-form').onsubmit = (e)=>{
    e.preventDefault();
    console.log("Creating new Client");
    ipcRenderer.send('new-client', document.getElementById('client-connect').value);
  }

  document.getElementById('start-server').onclick = start;


}

loop.setLoop(()=>{
  connection.init();
  Entity.registerCollidables();
  connection.update();
  connection.remove();
})

function start(){
  document.getElementById('start-server').innerText = "Running ...";
  document.getElementById('start-server').disabled = true;
  new World({netID: 'main', displayName: 'Homeworld'});
  new World({netID: 'alien', displayName: 'Martian'});

  Spell.reporter.on('error', (stack, spell, ...rest)=>{
    console.log(spell);
    connection.connections[Player.list.get(spell.player).socketID].socket.emit('spell-log', '<span style="color: red;">'.concat(...rest) + " in spell: " + spell.name + "\n\n" + stack + "</span>");
  })

  Spell.reporter.on('warning', (spell, ...rest)=>{
    console.log(spell);
    connection.connections[Player.list.get(spell.player).socketID].socket.emit('spell-log', '<span style="color: #ff7;">'.concat(...rest) + "</span>");
  })

  Spell.reporter.on('log', (spell, ...rest)=>{
    console.log(spell);
    connection.connections[Player.list.get(spell.player).socketID].socket.emit('spell-log', ''.concat(...rest));
  })

  Spell.reporter.on('binding-change', (spell,old)=>{
    if (old && Player.list.get(old)) connection.connections[Player.list.get(old).socketID].socket.emit('remove-spell', spell.netID);
    connection.connections[Player.list.get(spell.player).socketID].socket.emit('add-spell', spell.netID);
  })

  server.on('connection', (socket)=>{
    console.log('New Player');
    socket.once('login', ({name, pass})=>{

      let p = new Player({socketID: socket.id, name});
      socket.on('chat-msg', (msg)=>{
        // if ((/\<script\>/g).test(msg)) msg = "Im a dirty cheater! ";
        if (msg.charAt(0) != "/") {
          console.info('CHAT| ' + p.name + ': ' + msg);
          server.send('chat-msg', {who: p.name, text: msg, type: "chat"});
        } else {
          let res = Command.call(msg.slice(1),p);
          if (res) socket.emit('chat-msg', {text: res, type: "command-res"});
        }
      })

      socket.on('player-hotbar-scroll', (c)=>{
        p.inventory.selectedSlot = (p.inventory.selectedSlot + c) % p.inventory.hotbarSize;
        if (p.inventory.selectedSlot < 0) p.inventory.selectedSlot = p.inventory.hotbarSize - 1;
      })

      socket.on('spell-content-request', (req, res)=>{
        console.log(req);
        let spell = Spell.list.get(req);
        res(spell?spell.source:null);
      })

      socket.on('spell-compile', (id, content)=>{
        let spell = Spell.list.get(id);
        if (spell){
          spell.setSource(content);
          spell.compile();
        } else {
          Spell.reporter.warn("Failed to compile: Could not find spell.\n If this persists report an issue <a href='google.come.au/search?q=Issue'>here</a>")
        }
      })

      socket.on('new-spell', (name)=>{
        let spell = new Spell({name});
        spell.bindToPlayer(p);
        
      })

      socket.emit('connected-to-world', p.netID);
      socket.on('disconnect', (e)=>{
        console.log("Player Disconnected");
        server.send('chat-msg', {who: "", text: "<span style='color: yellow'>" + p.name + " disconnected.</span>"});
        p.remove();
      })
    })
  })

  server.begin();
  loop.play();
}

process.on('uncaughtException', (e)=>{
  let pMatch = e.stack.match(/UserSpell([a-zA-z0-9]+)/)
  if (pMatch && uuid.is(pMatch[1])){
    Spell.reporter.error(Spell.list.get(pMatch[1]), e.name + ": " + e.message);
    Spell.list.get(pMatch[1]).needsRecompile = true;
    Spell.list.get(pMatch[1]).recompReason = " an error during runtime. Further information is above. Please fix the issue and recompile";
  }
  else throw e;
})
