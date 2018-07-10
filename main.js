const {ipcRenderer} = require('electron');

const {Server, ConnectionManager, TrackList, NetworkWrapper, Rectangle} = require('electron-game-util');
global.SIDE = ConnectionManager.SERVER;

let server = new Server(2000);

connection = new ConnectionManager(SIDE, server);

let TestTrack = new TrackList(SIDE);

class TestClass1 extends NetworkWrapper(Rectangle, TestTrack) {
  constructor(opts){
    let {x,y,w,h} = opts;
    super(opts,x,y,w,h);
    this.name = opts.name;
  }

  getInitPkt(){
    let pack = super.getInitPkt();
    pack.x = this.x;
    pack.y = this.y;
    pack.w = this.w;
    pack.h = this.h;
    pack.name = this.name;
    return pack;
  }

  getUpdatePkt(){
    let pack = super.getInitPkt();
    pack.x = this.x;
    pack.y = this.y;
    pack.w = this.w;
    pack.h = this.h;
    return pack;
  }

  update(){
    this.x += 5;
  }
}

TestTrack.setType(TestClass1);

connection.addTrackList(TestTrack)


window.onload = ()=>{
  console.log("Document Loaded");

  document.getElementById('client-form').onsubmit = (e)=>{
    e.preventDefault();
    console.log("Creating new Client");
    ipcRenderer.send('new-client', document.getElementById('client-connect').value);
  }

  let loopID;

  document.getElementById('start-server').onclick = ()=>{

    server.begin();

    loopID = requestAnimationFrame(loop)
  }

  function loop(){
    connection.init();
    connection.update();
    connection.remove();
    requestAnimationFrame(loop)
  }
}
