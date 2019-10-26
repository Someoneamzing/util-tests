const {GUI: GUILoader, ConnectionManager} = require('electron-game-util');
const GUI = GUILoader(connection);
const path = require('path');
//, GUIElement, GUITextBox, GUIProgressBar, GUIButton, GUINumberField
// let counter = new GUI('counter', 300, 400, connection.server);
//
// counter.registerElements = function(){
//   this.addElement(new GUIProgressBar({name: 'number', max: new GUIElement.Property({property: "resetTime"}), progress: new GUIElement.Property({property: "counter"}), w: 100, h: 20, x: 30, y: 20}))
//   this.addElement(new GUIButton({name: 'button', click: new GUIElement.Property({property: 'reset'}), text: new GUIElement.Property({value: "Reset"}), x: 30, y: 45, w: 60, h: 20}));
//   // this.addElement(new GUINumberField({name: 'limit', max: new GUIElement.Property({value: 10000}), min: new GUIElement.Property({value: 0}), step: new GUIElement.Property({value: 1}), input: new GUIElement.Property({property: 'setReset'}), x: 30, y: 70, w: 60, h: 20}))
// }
// let docFrag;
// if (SIDE == ConnectionManager.SERVER) {
//   docFrag = document.createElement('template');
//   docFrag.innerHTML = "<div id='gui-list'></div>";
//   docFrag = docFrag.content;
// }
if (SIDE == ConnectionManager.SERVER) document.body.insertAdjacentHTML('beforeend', "<div id='gui-list' hidden></div>")
GUI.loadGUIsFromFile(path.join(__dirname, 'guis.html'), document.getElementById('gui-list'));
