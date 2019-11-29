const {Sprite, ConnectionManager, GUI: GUILoader} = require('electron-game-util');
const GUI = GUILoader(connection);
const uuid = require('uuid/v4');
const Inventory = require('./Inventory.js');
const ItemEntity = require('./ItemEntity.js');
const ItemStack = require('./ItemStack.js');
const ItemData = require('./ItemData.js');
const Item = require('./Item.js');
const Player = require('./Player.js');

class GUIInventory extends GUI.Element {
  static get getters(){
    return ['inventory', 'section', 'label', 'dirty'];
  }

  static get setters(){
    return [];
  }

  static get events(){
    return [];//
  }

  static get clientIPCFns(){
    return ['clickSlot'];
  }

  constructor() {
    super();
    this.inventory = null;
    this.handleSlotClick = this.handleSlotClick.bind(this)
    this.handleTooltip = this.handleTooltip.bind(this)
    // this.propUpdate = this.propUpdate.bind(this);
  }

  propUpdate(prop, oldVal, newVal) {
    console.log(prop, oldVal, newVal);
    switch (prop) {
      case "inventory":
        this.inventory = newVal;
        this.updateListing();
        break;
      case "section":
        this.section = newVal;
        break;
      case "label":
        this.shadowRoot.getElementById("title").innerText = newVal;
        break;
      case "dirty":
        console.log("Got update");
        if (newVal == false) this.updateListing();
    }
  }

  clickSlot(socket, slot, button, modifiers){
    let inv = Inventory.list.get(this.getServerAttr(socket, 'inventory'));
    let section = this.getServerAttr(socket, 'section')
    let clickedStack = inv.get(section, slot);
    console.log(socket.id, slot, button, section, GUIInventory.socketHeldItems[socket.id], clickedStack);
    if (socket.id in GUIInventory.socketHeldItems) {
      let heldItem = GUIInventory.socketHeldItems[socket.id];
      //The player is holding an item already.
      if (button == 0) {
        //LEFT_MOUSE
        if (clickedStack) {
          //Already item here
          if (clickedStack.type == heldItem.type && heldItem.data.matches(clickedStack.data)) {
            //Item is the same type and has matching data.
            let left = heldItem.count - inv.add(heldItem.type, heldItem.count, heldItem.data, section, slot);
            if (left <= 0) {
              delete GUIInventory.socketHeldItems[socket.id];
            } else {
              GUIInventory.socketHeldItems[socket.id].count = left;
            }
          } else {
            //The item is a different type or data.
            inv.set(section, slot, heldItem.count, heldItem.type, heldItem.data);
            GUIInventory.socketHeldItems[socket.id] = clickedStack;
          }
        } else {
          //The slot is empty
          inv.set(section, slot, heldItem.count, heldItem.type, heldItem.data);
          delete GUIInventory.socketHeldItems[socket.id];
        }
      } else if (button == 2) {
        //RIGHT_MOUSE
        if (clickedStack) {
          //Already item here
          if (clickedStack.type == heldItem.type && heldItem.data.matches(clickedStack.data)) {
            //Item is the same type and has matching data.
            inv.add(heldItem.type, 1, heldItem.data, section, slot);
            if (heldItem.count - 1 <= 0) {
              delete GUIInventory.socketHeldItems[socket.id];
            } else {
              GUIInventory.socketHeldItems[socket.id].count = heldItem.count - 1;
            }
          } else {
            //The item is a different type or data.
            inv.set(section, slot, heldItem.count, heldItem.type, heldItem.data);
            GUIInventory.socketHeldItems[socket.id] = clickedStack;
          }
        } else {
          //The slot is empty
          inv.set(section, slot, 1, heldItem.type, heldItem.data);
          if (heldItem.count - 1 <= 0) {
            delete GUIInventory.socketHeldItems[socket.id];
          } else {
            GUIInventory.socketHeldItems[socket.id].count = heldItem.count - 1;
          }
        }
      }
    } else {
      //The player is not holding an item yet.
      if (button == 0) {
        //LEFT_MOUSE
        if (clickedStack) {
          GUIInventory.socketHeldItems[socket.id] = clickedStack;
          inv.clear(section, slot);
        } //If no clicked stack do nothing.
      } else if (button == 2) {
        //RIGHT_MOUSE
        if (clickedStack) {
          GUIInventory.socketHeldItems[socket.id] = clickedStack.split(Math.ceil(clickedStack.count / 2));
          if (clickedStack.count <= 0) {
            inv.clear(section, slot);
          }
        }//If no clicked stack do nothing
      }
    }
  }

  disconnect(socket) {
    if (connection.side == ConnectionManager.SERVER && socket.id in GUIInventory.socketHeldItems) {
      let heldStack = GUIInventory.socketHeldItems[socket.id];
      let dropper = Player.getBySocket(socket);
      new ItemEntity({x: dropper.x, y: dropper.y, type: heldStack.type, count: heldStack.count, pickupDelay: 180});
      delete GUIInventory.socketHeldItems[socket.id];
    } else if (connection.side == ConnectionManager.CLIENT) {
      GUIInventory.dropItem()// this.shadowRoot.removeEventListener('click', this.handleSlotClick);
    }
    super.disconnect(socket);
  }

  updateListing(){
    let inv = Inventory.list.get(this.inventory);
    let res = "";
    console.log(this.section);
    switch (this.section) {
      case "inventory":
        for (let slot = 0; slot < inv.size; slot ++) {
          let stack = inv.get(this.section, slot);
          res += `<div class='inventory-slot'>${stack?`<img class="item-icon" src="${Sprite.get('item-' + stack.type).getSpriteURL()}"><span class="item-count">${stack.count}</span>`:''}</div>`
        }
        break;
      case "hotbar":
        for (let slot = 0; slot < inv.hotbarSize; slot ++) {
          let stack = inv.get(this.section, slot);
          res += `<div class='inventory-slot'>${stack?`<img class="item-icon" src="${Sprite.get('item-' + stack.type).getSpriteURL()}"><span class="item-count">${stack.count}</span>`:''}</div>`
        }
        break;
      case "any":
        for (let slot = 0; slot < inv.hotbarSize; slot ++) {
          let stack = inv.get("hotbar", slot);
          res += `<div class='inventory-slot'>${stack?`<img class="item-icon" src="${Sprite.get('item-' + stack.type).getSpriteURL()}"><span class="item-count">${stack.count}</span>`:''}</div>`
        }
        for (let slot = 0; slot < inv.size; slot ++) {
          let stack = inv.get("inventory", slot);
          res += `<div class='inventory-slot'>${stack?`<img class="item-icon" src="${Sprite.get('item-' + stack.type).getSpriteURL()}"><span class="item-count">${stack.count}</span>`:''}</div>`
        }
        break;
    }
    this.shadowRoot.getElementById("inventory-list").innerHTML = res;
  }

  connectedCallback(){
    super.connectedCallback();
    console.log("Connected Callback on GUIInventory");
    this.shadowRoot.addEventListener('mouseup', this.handleSlotClick);
    this.shadowRoot.addEventListener('mousemove', this.handleTooltip);
    this.addEventListener('mouseleave', this.handleTooltip);

  }

  handleSlotClick(e){
    console.log("Slot click");
    let slot = e.target.closest(".inventory-slot");
    if (slot) {
      slot = Array.from(slot.parentElement.children).indexOf(slot);
      this.clickSlot(slot, e.button, {shift: e.shiftKey, control: e.ctrlKey, alt: e.altKey});
      let inv = Inventory.list.get(this.inventory);
      let clickedStack = inv.get(this.section, slot);
      let clickedStackData = clickedStack?new ItemData(clickedStack.data):null;
      let clickedItemType = clickedStack?Item.get(clickedStack.type):null;
      let button = e.button;
      if (GUIInventory.socketHeldItem) {
        let heldItem = GUIInventory.socketHeldItem;
        let heldItemData = new ItemData(heldItem.data);
        //The player is holding an item already.
        if (button == 0) {
          //LEFT_MOUSE
          if (clickedStack) {
            //Already item here
            if (clickedStack.type == heldItem.type && heldItemData.matches(clickedStackData)) {
              //Item is the same type and has matching data.
              let left = Math.max(0, heldItem.count - clickedItemType.maxStack + clickedStack.count)
              if (left <= 0) {
                GUIInventory.dropItem();
              } else {
                GUIInventory.socketHeldItem.count = left;
                GUIInventory.holdItem(GUIInventory.socketHeldItem);
              }
            } else {
              //The item is a different type or data.
              GUIInventory.holdItem(clickedStack);
            }
          } else {
            //The slot is empty
            GUIInventory.dropItem();
          }
        } else if (button == 2) {
          //RIGHT_MOUSE
          if (clickedStack) {
            //Already item here
            if (clickedStack.type == heldItem.type && heldItemData.matches(clickedStackData)) {
              //Item is the same type and has matching data.
              if (heldItem.count - 1 <= 0) {
                GUIInventory.dropItem();
              } else {
                GUIInventory.socketHeldItem.count -=1;
                GUIInventory.holdItem(GUIInventory.socketHeldItem);
              }
            } else {
              //The item is a different type or data.
              GUIInventory.holdItem(clickedStack);
            }
          } else {
            //The slot is empty
            if (heldItem.count - 1 <= 0) {
              GUIInventory.dropItem();
            } else {
              GUIInventory.socketHeldItem.count -=1;
              GUIInventory.holdItem(GUIInventory.socketHeldItem);
            }
          }
        }
      } else {
        //The player is not holding an item yet.
        if (button == 0) {
          //LEFT_MOUSE
          if (clickedStack) {
            GUIInventory.holdItem(clickedStack);
          } //If no clicked stack do nothing.
        } else if (button == 2) {
          //RIGHT_MOUSE
          if (clickedStack) {
            GUIInventory.holdItem(new ItemStack(clickedStack.type, Math.ceil(clickedStack.count / 2), JSON.stringify(clickedStack.data)));
          }//If no clicked stack do nothing
        }
      }
    }
    // this.updateListing();
  }

  handleTooltip(e) {
    if (GUIInventory.socketHeldItem) return;
    let slot = e.target.closest(".inventory-slot");
    if (slot) {
      slot = Array.from(slot.parentElement.children).indexOf(slot);
      let inv = Inventory.list.get(this.inventory);
      let clickedStack = inv.get(this.section, slot);
      if (clickedStack) {
        GUIInventory.showTooltip(clickedStack);
        GUIInventory.heldItemElement.style.top = e.clientY + "px";
        GUIInventory.heldItemElement.style.left = (e.clientX + 15) + "px";
      } else {
        GUIInventory.hideTooltip()
      }
    } else {GUIInventory.hideTooltip()}
  }

  static showTooltip(stack){
    GUIInventory.hideTooltip();
    GUIInventory.heldItemElement.innerHTML = `<div class='item-tooltip'>${Item.get(stack.type).getTooltip(stack)}</div>`
  }

  static hideTooltip(){
    if (!(GUIInventory.heldItemElement.children.length > 0 && GUIInventory.heldItemElement.children[0].classList.contains('item-tooltip'))) return;
    GUIInventory.heldItemElement.innerHTML = "";
  }

  static holdItem(stack){
    if (GUIInventory.socketHeldItem !== null) GUIInventory.dropItem();
    GUIInventory.socketHeldItem = stack;
    GUIInventory.heldItemElement.style.top = controls.mouse.y + "px";
    GUIInventory.heldItemElement.style.left = (controls.mouse.x) + "px";
    GUIInventory.heldItemElement.innerHTML = `${stack?`<img class="item-icon" src="${Sprite.get('item-' + stack.type).getSpriteURL()}"><span class="item-count">${stack.count}</span>`:''}`;
    document.addEventListener('mousemove', GUIInventory.moveHeldItem);
  }

  static dropItem(){
    GUIInventory.socketHeldItem = null;
    document.removeEventListener('mousemove', GUIInventory.moveHeldItem);
    GUIInventory.heldItemElement.innerHTML = "";
  }

  static moveHeldItem(e){
    GUIInventory.heldItemElement.style.top = e.clientY + "px";
    GUIInventory.heldItemElement.style.left = e.clientX + "px";
  }

  static registerTemplate(){
    if (connection.side == ConnectionManager.CLIENT) {
      document.body.insertAdjacentHTML('beforeend', `<link rel='stylesheet' href="../classes/GUIInventory.css"><div id="inventory-gui-held-item" style="position: fixed; pointer-events: none; z-index: 100; display: inline-block;"></div>`);
      GUIInventory.heldItemElement = document.getElementById('inventory-gui-held-item');
    }
    return `<link rel="stylesheet" href="../classes/GUIInventory.css" /><p id='title'></p><div id="inventory-list"></div>`;
  }
}

GUIInventory.socketHeldItems = {};
GUIInventory.socketHeldItem = null;

GUIInventory.heldItemElement = null;

GUI.Element.define('gui-inventory', GUIInventory);

module.exports = GUIInventory;
