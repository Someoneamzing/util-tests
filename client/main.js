const {Client, Sprite, ConnectionManager, ControlInterface, TrackList, NetworkWrapper, Rectangle, Circle, GameLoop, GameCanvas} = require('electron-game-util');
global.SIDE = ConnectionManager.CLIENT;
let host = decodeURIComponent(location.hash.slice(1));

const Entity = require('../classes/Entity.js');
const Wall = require('../classes/Wall.js');
const Player = require('../classes/Player.js');
const Enemy = require('../classes/Enemy.js');
const World = require('../classes/World.js');
const Inventory = require('../classes/Inventory.js');
const Item = require('../classes/Item.js');

let client;

function ready(){
  $('#killed').hide();
  $('#load-container').hide();
   client = new Client('http://' + host, 2000);

  connection = new ConnectionManager(SIDE, client);

  connection.addTrackList(Entity.list);
  connection.addTrackList(Wall.list);
  connection.addTrackList(Enemy.list);
  connection.addTrackList(Player.list);
  connection.addTrackList(World.list);
  connection.addTrackList(Inventory.list);
  connection.addTrackList(Item.list);

  require('./sprites.js');

  Sprite.loadAll($('#load')).then(start);
}

function start(){
  client.connect();

  let loop = new GameLoop('main', 1000/60);
  let gc = new GameCanvas({full: true});
  let playerID = null;
  let myPlayer = null;
  let controls = new ControlInterface(gc, client);
  let damageTimer = 0;


  client.on('connected-to-world', (netID)=>{
    console.log('In World');
    playerID = netID;
    let whenDone = (pack)=>{
      myPlayer = Player.list.get(netID);
      if(myPlayer) {
        client.on('player-damage', (data)=>{
          damageTimer = 60;
        })
        client.on('player-killed', (who)=>{
          $('#killed').show().delay(2000).hide('fast');
        })
        gc.resize();
        gc.camera.setFollow([myPlayer]);
        console.log(gc.camera.follow);
        loop.play();
        client.socket.off("connectionmanager-init", whenDone);
      }
    }
    client.on('connectionmanager-init', whenDone)
  })


  loop.setLoop(()=>{
    //gc.clear();
    gc.begin();
    Wall.list.run('show', gc);
    Item.list.run('show', gc);
    Enemy.list.run('show', gc);
    Player.list.run('show', gc);
    gc.fill("black")
    gc.ctx.fillText((new Date()).toString(), 0,0);
    gc.end();
    gc.stroke('black');
    gc.fill('red');
    gc.cornerRect(10, 10, 100, 15);
    gc.noStroke();
    gc.fill('green');
    gc.cornerRect(10,10, (myPlayer.health / myPlayer.maxHealth) * 100, 15);
    controls.endCycle();
    Sprite.endDraw();
  })

  window.onresize = (e)=>{
    gc.resize();
  }
}

window.onload = ready;

//loop.play();
