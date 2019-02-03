const {GUI, GUIElement, GUITextBox, GUIProgressBar, GUIButton} = require('electron-game-util');

let counter = new GUI('counter', 300, 400, connection.server);

counter.registerElements = function(){
  this.addElement(new GUIProgressBar({name: 'number', max: new GUIElement.Property({property: "resetTime"}), progress: new GUIElement.Property({property: "counter"}), w: 100, h: 20, x: 30, y: 20}))
  this.addElement(new GUIButton({name: 'button', click: new GUIElement.Property({property: 'reset'}), text: new GUIElement.Property({value: "Reset"}), x: 30, y: 45, w: 60, h: 20}));
}
