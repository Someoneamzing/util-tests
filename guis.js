const {GUI, GUIElement, GUITextBox, GUIProgressBar} = require('electron-game-util');

let counter = new GUI('counter', 300, 400, connection.server);

counter.registerElements = function(){
  this.addElement(new GUIProgressBar({name: 'number', max: new GUIElement.Property({property: "resetTime"}), progress: new GUIElement.Property({property: "counter"}), w: 100, h: 20, x: 30, y: 20}))
}
