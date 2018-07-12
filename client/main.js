const {Client, ConnectionManager, ControlInterface, TrackList, NetworkWrapper, Rectangle, GameLoop, GameCanvas} = require('electron-game-util');
global.SIDE = ConnectionManager.CLIENT;
let host = decodeURIComponent(location.hash.slice(1));

const Entity = require('../classes/Entity.js');
const Wall = require('../classes/Wall.js');
const Player = require('../classes/Player.js');
const World = require('../classes/World.js');

function ready(){
  let client = new Client('http://' + host, 2000);

  connection = new ConnectionManager(SIDE, client);

  connection.addTrackList(Entity.list);
  connection.addTrackList(Wall.list)
  connection.addTrackList(Player.list);
  connection.addTrackList(World.list);

  client.connect();

  let loop = new GameLoop('main', 1000/60);
  let gc = new GameCanvas({full: true});
  let playerID = null;
  let myPlayer = null;
  let controls = new ControlInterface(gc, client);


  client.on('connected-to-world', (netID)=>{
    console.log('In World');
    playerID = netID;
    let whenDone = (pack)=>{
      myPlayer = Player.list.get(netID);
      if(myPlayer) {
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
    Player.list.run('show', gc);
    gc.fill("black")
    gc.ctx.fillText((new Date()).toString(), 0,0);
    gc.end();
    controls.endCycle()
  })

  window.onresize = (e)=>{
    gc.resize();
  }
}

window.onload = ready;

//loop.play();
