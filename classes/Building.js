/**Represents a type of building that can exist and the logic that goes with it. Also defines the GUIs to use for the building.
  *
  *

*/

const Entity = require('./Entity.js');

const {TrackList, ConnectionManager, CollisionGroup} = require('electron-game-util');

let list = new TrackList(SIDE, false);

class Building extends NetworkWrapper(CollisionGroup(Entity, "Building"), list) {
  constructor(opts){
    super(opts);
    this.gui = this.constructor.gui;
    // this.gui.on('');
  }

  use(player) {
    this.gui.open(connection.connections[player.socketID].socket, this, {player});
  }

  destroy(player) {
    this.gui.closeOnObject(this);
  }

  static get registryName(){
    return "building";
  }
}

list.setType(Building);
Building.list = list;

module.exports = Building;
