const {ipcRenderer} = require('electron');
require('./config.js');
const uuid = require('uuidv4');
const fs = require('fs');
const path = require('path');

global.markTime = (event, dir)=>{
  if (!DO_CONNECTION_LOG) return;
  let date = new Date().toISOString();
  console.log(date);
  date = date.slice(date.indexOf("T"), date.indexOf("Z"));

  console.log("( " + date + " ) " + dir + "'" + event + "'")
  fs.writeFileSync(path.join(__dirname, 'connection-log.txt'), "SERVER: ( " + date + " ) " + dir + "'" + event + "'\n", {encoding: "utf-8", flag: "as"});

}

const {Server, ConnectionManager, TrackList, NetworkWrapper, Rectangle, GameLoop, Line, Point, GUI, GUIElement} = require('electron-game-util');
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
const loki = require('lokijs');
const db = new loki('data.db', {autosave: true});
let users;
// let

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
require('./guis.js');

GUI.registerAll(document.createElement('div'));

window.onload = ()=>{
  console.log("Document Loaded");

  document.getElementById('client-form').onsubmit = (e)=>{
    e.preventDefault();
    console.log("Creating new Client");
    ipcRenderer.send('new-client', document.getElementById('client-connect').value);
  }

  document.getElementById('start-server').onclick = start;

  window.addEventListener('beforeunload', (e)=>{
    markTime('server-reload', 'send');
    server.send('server-reload');
  })

}

loop.setLoop(()=>{
  connection.init();
  Entity.registerCollidables();
  connection.update();
  connection.remove();
})

function start(){
  fs.writeFileSync(path.join(__dirname, 'connection-log.txt'), "----------------------------------------------------------------------------------------\n--------------------------------------START NEW LOG--------------------------------------\n----------------------------------------------------------------------------------------\n", {encoding: "utf-8", flag: "as"});

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

  function successfulLogin(socket, name, pass) {
    console.log("Client logged in");

    markTime('loaded', 'on');
    socket.on('loaded', ()=>{
      console.log("Player loaded");
      playerConnected(socket, name, pass);
    })
  }

  function playerConnected(socket, name, pass){

    markTime('connected-to-server', 'emit');
    let p = new Player({socketID: socket.id, name});

    markTime('chat-msg', 'on');
    socket.on('chat-msg', (msg)=>{
      // if ((/\<script\>/g).test(msg)) msg = "Im a dirty cheater! ";
      if (msg.charAt(0) != "/") {
        console.info('CHAT| ' + p.name + ': ' + msg);
        markTime('chat-msg', 'send');
        server.send('chat-msg', {who: p.name, text: msg, type: "chat"});
      } else {
        let res = Command.call(msg.slice(1),p);
        if (res) {
          markTime('chat-msg', 'emit');
          socket.emit('chat-msg', {text: res, type: "command-res"});
        }
      }
    })

    markTime('player-hotbar-scroll', 'on');
    socket.on('player-hotbar-scroll', (c)=>{
      p.inventory.selectedSlot = (p.inventory.selectedSlot + c) % p.inventory.hotbarSize;
      if (p.inventory.selectedSlot < 0) p.inventory.selectedSlot = p.inventory.hotbarSize - 1;
    })

    markTime('spell-content-request', 'on');
    socket.on('spell-content-request', (req, res)=>{
      console.log(req);
      let spell = Spell.list.get(req);
      res(spell?spell.source:null);
    })

    markTime('spell-compile', 'on');
    socket.on('spell-compile', (id, content)=>{
      let spell = Spell.list.get(id);
      if (spell){
        spell.setSource(content);
        Spell.reporter.log(spell, "Saving...");
        spell.save(Player.list.get(spell.player).name).then((res)=>{
          if (res) {
            spell.compile();
            Spell.reporter.log(spell, "Saved!");
          } else {
            Spell.reporter.warn(spell, "Failed to save!");
          }
        })
      } else {
        Spell.reporter.warn("Failed to compile: Could not find spell.\n If this persists report an issue <a href='google.come.au/search?q=Issue'>here</a>")
      }
    })

    markTime('new-spell', 'on');
    socket.on('new-spell', (name)=>{
      let spell = new Spell({name});
      p.inventory.add("spell", 1, {spell: spell.id});
      spell.bindToPlayer(p);
    })

    markTime('run-spell', 'on');
    socket.on('run-spell', (id)=>{
      p.useSpell(id)
    })

    socket.emit('connected-to-server', p.netID, (res)=>{
      console.log('New Player');
      fs.readdir('./user-scripts/' + p.name, "utf-8", (err,files)=>{
        if (err) return console.log("Could not load the users scripts. Assuming first login.");
        for (let file of files) {
          fs.readFile('./user-scripts/' + p.name + "/" + file, 'utf-8', (err, data)=>{
            if (err) return console.error(err);
            let spell = new Spell({name: file.slice(0, file.indexOf(".")), source: data});
            spell.bindToPlayer(p);
          })
        }
      })
    });

  }

  markTime('connection', 'on');
  server.on('connection', (socket)=>{
    markTime('signup', 'on');
    socket.on('signup', ({name, pass}, res)=>{
      if (users.by('name', name)){
        res(false, "Username Taken");
      } else {
        users.insertOne({name, pass});
        res(true);
      }
    })
    markTime('disconnect', 'on');
    socket.on('disconnect', (e)=>{
      let p = Player.getBySocket(socket);
      console.log(p);
      console.log("Client Disconnected");
      if (p) {
        markTime('chat-msg', 'send');
        server.send('chat-msg', {who: "", text: "<span style='color: yellow'>" + p.name + " disconnected.</span>"});
        p.remove();
      }
    })
    markTime('login', 'on');
    socket.on('login', ({name, pass}, res)=>{
      let user = users.by('name', name);
      console.log(user);
      if (user) {
        if (user.pass === pass) {
          successfulLogin(socket, name, pass);
          res(true);
        } else {
          res(false, "Invalid Password")
        }
      } else {
        res(false, "Invalid Username");
      }
    })
  })

  db.loadDatabase({}, (e)=>{
    if (e) throw e;
    console.log("Databse loaded");
    users = db.getCollection('users')
    if (!users) {
      users = db.addCollection('users', {unique:["name"]})
    }
    server.begin();
    loop.play();
  })

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
