const {ipcRenderer} = require('electron');

const {Server, ConnectionManager, TrackList, NetworkWrapper, Rectangle, GameLoop, Line, Point} = require('electron-game-util');
global.SIDE = ConnectionManager.SERVER;

const Entity = require('./classes/Entity.js');
const Wall = require('./classes/Wall.js');
const Player = require('./classes/Player.js');
const World = require('./classes/World.js');
const Enemy = require('./classes/Enemy.js');
const Inventory = require('./classes/Inventory.js');
const ItemEntity = require('./classes/ItemEntity.js');

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

require('./items.js');

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

  server.on('connection', (socket)=>{
    console.log('New Player');
    socket.once('login', ({name, pass})=>{

      let p = new Player({socketID: socket.id, name});
      socket.emit('connected-to-world', p.netID);
      socket.on('disconnect', (e)=>{
        console.log("Player Disconnected");
        p.remove();
      })
    })
  })

  server.begin();
  loop.play();
}
