const {ConnectionManager, GUI: GUILoader} = require('electron-game-util');
const GUI = GUILoader(connection);
const uuid = require('uuid/v4');

class GUIInventory extends Element {
  static get getters(){
    return ['inventory', 'player'];
  }

  static get setters(){
    return [];
  }

  static get events(){
    return ['pickup-item', 'place-item']
  }

  constructor() {
    super();
    // this.propUpdate = this.propUpdate.bind(this);
  }

  propUpdate(prop, oldVal, newVal) {
    console.log(prop, oldVal, newVal);
    if (prop == 'text') this.shadowRoot.getElementById('text').innerText = newVal;
  }

  connectedCallback(){
    super.connectedCallback();
  }

  static registerTemplate(){
    return "<p id='title'></p>";
  }
}

GUI.Element.define('gui-inventory', GUIInventory);

module.exports = GUIInventory;
