const {ipcRenderer} = require('electron');
require('./config.js');
const uuid = require('uuidv4');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
window.$ = require('jquery');


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

let server = new Server(2000);
global.connection = new ConnectionManager(SIDE, server);


const Entity = require('./classes/Entity.js');
const Wall = require('./classes/Wall.js');
const Player = require('./classes/Player.js');
const World = require('./classes/World.js');
const Enemy = require('./classes/Enemy.js');
const Inventory = require('./classes/Inventory.js');
const ItemEntity = require('./classes/ItemEntity.js');
const Teleporter = require('./classes/Teleporter.js');
const Building = require('./classes/Building.js');
const Counter = require('./classes/Counter.js');
const Chest = require('./classes/Chest.js');
const Command = require('./classes/Command.js');
const LootTable = require('./classes/LootTable.js');
const Spell = require('./classes/Spell.js');
const Arrow = require('./classes/Arrow.js');
const GUIInventory = require('./classes/GUIInventory.js');
// const Robot = require('./classes/Robot.js');
const loki = require('lokijs');
const db = new loki('data.db', {autosave: true});
let users;
// let

let loop = new GameLoop('main', 1000/60);


connection.addTrackList(Entity.list);
connection.addTrackList(Wall.list);
connection.addTrackList(Player.list);
connection.addTrackList(World.list);
connection.addTrackList(Enemy.list);
// connection.addTrackList(Robot.list);
connection.addTrackList(ItemEntity.list);
connection.addTrackList(Teleporter.list);
connection.addTrackList(Building.list);
connection.addTrackList(Counter.list);
connection.addTrackList(Chest.list);
connection.addTrackList(Inventory.list);
connection.addTrackList(Spell.list);
connection.addTrackList(Arrow.list);

require('./items.js');
require('./commands.js');

window.Log = {
  needsReflow: false,
  reflow: ()=>{
    let out = [];
    for (let msg of Log.new) {
      out.push(`<tr><td><time datetime="${msg[0].toISOString()}">${msg[0].getHours() + ":" + msg[0].getMinutes() + ":" + msg[0].getSeconds() + ":" + msg[0].getMilliseconds()}</time></td><td><pre>${msg[1]}</pre></td></tr>`)
    }
    // Log.new.map(e=>Log.old.push(e));
    Log.new.length = 0;
    $("#log").append(out);
    if ($("#log").find("tr").length > 100) {
      $("#log").find("tr").slice(0,$("#log").find("tr").length-100).remove();
    }
    Log.needsReflow = false;
  },
  new: [],
  old: []
}


window.echo = (...msg)=>{
  Log.new.push([new Date(), msg.join(", ")]);
  if (!Log.needsReflow) {
    Log.needsReflow = true;
    setImmediate(Log.reflow);
  }
}

window.onload = ()=>{
  console.log("Document Loaded");


  require('./guis.js');

  document.getElementById('client-form').onsubmit = (e)=>{
    e.preventDefault();
    console.log("Creating new Client");
    ipcRenderer.send('new-client', document.getElementById('client-connect').value);
  }

  document.getElementById('start-server').onclick = start;

  document.getElementById('save-game').onclick = saveGame;

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

async function saveGame(){
  let name = global.WORLD_NAME;
  echo("Saving game as '" + name + "'...");
  let start = Date.now();
  try {await fsp.mkdir('saves/' + name , {recursive:true})} catch (e) {}
  let data = connection.serialiseLists();
  await fsp.writeFile(`saves/${name}/data.json`, data, 'utf-8');
  savePlayers();
  echo("Done saving! Took " + (Date.now() - start) + " ms")
}

async function savePlayers(){
  let name = global.WORLD_NAME;
  let data = Player.getSaveData();
  let oldData = JSON.parse(await fsp.readFile(`saves/${name}/players.json`, 'utf-8'));
  for (let name in data) {
    oldData[name] = data[name];
  }
  await fsp.writeFile(`saves/${name}/players.json`, JSON.stringify(oldData), 'utf-8');
}

async function start(){
  if (DO_CONNECTION_LOG) fs.writeFileSync(path.join(__dirname, 'connection-log.txt'), "----------------------------------------------------------------------------------------\n--------------------------------------START NEW LOG--------------------------------------\n----------------------------------------------------------------------------------------\n", {encoding: "utf-8", flag: "as"});

  document.getElementById('start-server').innerText = "Running ...";
  document.getElementById('start-server').disabled = true;
  document.getElementById('save-game').disabled = false;

  echo("Running server...");
  echo("Loading LootTables");
  await LootTable.loadDirectory("main","loot_tables")
  echo("Initialising Worlds...")
  new World({netID: 'main', displayName: 'Homeworld'});
  new World({netID: 'alien', displayName: 'Martian'});

  echo("Starting spell engine...")
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

  async function playerConnected(socket, name, pass){

    markTime('connected-to-server', 'emit');
    let data;
    try {
      data = JSON.parse(await fsp.readFile(`saves/${global.WORLD_NAME}/players.json`))[name] || {name, x: 0, y: 0};
    } catch (e) {
      data = {name, x: 0, y: 0};
    }
    console.log(data);
    let p = new Player({socketID: socket.id, ...data});

    markTime('chat-msg', 'on');
    socket.on('chat-msg', (msg)=>{
      if ((/\<script\>/g).test(msg)) msg = "Im a dirty cheater! ";
      echo("[CHAT] &lt;" + p.name + "&gt; " + msg)
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
      p.inventory.add("spell", 1, {spell: spell.netID});
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
    server.send('chat-msg', {who: "", text: "<span style='color: yellow'>" + p.name + " has joined the game.</span>"});


  }

  echo('Loading world...');
  try {
    connection.deserialise(fs.readFileSync(`saves/${global.WORLD_NAME}/data.json`, 'utf-8'))
    echo('Done loading!')
  } catch (e) {
    echo("No world found or possible error in loading save. Generating new world.")
  }

  echo('Waiting for connections...');
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
    socket.on('disconnect', async (e)=>{
      let p = Player.getBySocket(socket);
      console.log(p);
      console.log("Client Disconnected");
      if (p) {
        await savePlayers();
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
        if (Player.getByName(name)) {
          res(false, "Player Connected");
        } else if (user.pass === pass) {
          successfulLogin(socket, name, pass);
          res(true);
        } else {
          res(false, "Invalid Password");
        }
      } else {
        res(false, "Invalid Username");
      }
    })
  })
  echo("Loading database...")
  db.loadDatabase({}, (e)=>{
    if (e) throw e;
    echo("Database loaded.")
    console.log("Databse loaded");
    users = db.getCollection('users')
    if (!users) {
      users = db.addCollection('users', {unique:["name"]})
    }
    echo("Starting connections...")
    server.begin();
    echo("Running game loop...")
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
