const {Client, ConnectionManager, TrackList, NetworkWrapper, Rectangle} = require('electron-game-util');
global.SIDE = ConnectionManager.CLIENT;
console.log(location.hash.slice(1));
let host = decodeURIComponent(location.hash.slice(1));

console.log(Object.keys(host));

let client = new Client('http://' + host, 2000);

connection = new ConnectionManager(SIDE, client);

let TestTrack = new TrackList(SIDE);

class TestClass1 extends NetworkWrapper(Rectangle, TestTrack) {
  constructor(opts){
    let {x,y,w,h} = opts;
    super(opts,x,y,w,h);
    this.name = opts.name;
  }

  update(pack){
    super.update(pack);
    this.x = pack.x;
    this.y = pack.y;
    this.w = pack.w;
    this.h = pack.h;
  }
}

TestTrack.setType(TestClass1);

connection.addTrackList(TestTrack);

client.connect();
