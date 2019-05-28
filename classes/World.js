const {Point, Circle, Rectangle, QuadTree, NetworkWrapper, QueryResult, ConnectionManager} = require('electron-game-util');

let list = new TrackList(SIDE);

class World extends NetworkWrapper(Object,list,["displayName"]){
  constructor(opts){
    let {id, displayName} = opts;
    super(opts);
    this.displayName = displayName;
    if (SIDE == ConnectionManager.SERVER) this.collisionTree = new QuadTree(new Rectangle(0,0,10000,10000), 10, true);

  }

  // getInitPkt(){
  //   let pack = super.getInitPkt();
  //   pack.displayName = this.displayName;
  //   return pack;
  // }

  // getUpdatePkt(){
  //   let pack = super.getUpdatePkt();
  //   pack.displayName = this.displayName;
  //   return pack;
  // }

  // update(pack){
  //   super.update(pack);
  //   switch(SIDE){
  //     case ConnectionManager.CLIENT:
  //       this.displayName = pack.displayName;
  //       break;
  //   }
  // }
}

list.setType(World);

World.list = list;

module.exports = World;
