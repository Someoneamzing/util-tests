const {GUI, GUIElement, GUITextBox} = require('electron-game-util');

let test = new GUI('test', connection.server);

test.registerElements = function(){
  this.addElement(new GUITextBox('thatThing', 'x', connection.server));
}
