/**Represents a type of building that can exist and the logic that goes with it. Also defines the GUIs to use for the building.
  *
  *

*/

const Entity = require('./Entity.js');

const {TrackList} = require('electron-game-util');

let list = new TrackList(SIDE);

class Building extends NetworkWrapper(Object, list) {
  constructor(opts){
    super(opts);
    this.gui = this.constructor.gui;
    gui.on('');
  }

  use(player) {
    this.gui.open(connection.connections[player.socketID], this);
  }

  destroy(player) {
    this.gui.closeOnObject(this);

  }
}

list.setType(Building);
Building.list = list;
