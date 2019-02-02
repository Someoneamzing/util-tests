const {GUI, GUIElement, GUITextBox} = require('electron-game-util');

let counter = new GUI('counter', connection.server);

counter.registerElements = function(){
  this.addElement(new GUITextBox('number', 'counter'))
}
