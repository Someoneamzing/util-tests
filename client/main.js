const {Client, Sprite, ConnectionManager, ControlInterface, TrackList, NetworkWrapper, Rectangle, Line, Point, Circle, GameLoop, GameCanvas} = require('electron-game-util');
global.SIDE = ConnectionManager.CLIENT;
require('../config.js');
const path = require('path')
let host = decodeURIComponent(location.hash.slice(1));
require('../ace-src-noconflict/ace.js');
ace.config.set('basePath', path.join(__dirname, "../ace-src-noconflict"))
window.editor = null;
window.currentSpell = null;

require('bootstrap');

const Entity = require('../classes/Entity.js');
const Wall = require('../classes/Wall.js');
const Player = require('../classes/Player.js');
const Enemy = require('../classes/Enemy.js');
const World = require('../classes/World.js');
const Inventory = require('../classes/Inventory.js');
const ItemEntity = require('../classes/ItemEntity.js');
const Teleporter = require('../classes/Teleporter.js');
const Spell = require('../classes/Spell.js');
const {jsParser, jsonParser} = require('../classes/Syntax.js');

let client;

function ready(){
  $('#killed').hide();
  $('#load-container').hide();
  $("#chat-container").hide();
  client = new Client('http://' + host, 2000);

  connection = new ConnectionManager(SIDE, client);

  connection.addTrackList(Entity.list);
  connection.addTrackList(Wall.list);
  connection.addTrackList(Enemy.list);
  connection.addTrackList(Player.list);
  connection.addTrackList(World.list);
  connection.addTrackList(Inventory.list);
  connection.addTrackList(ItemEntity.list);
  connection.addTrackList(Teleporter.list);
  connection.addTrackList(Spell.list);

  $('#login').submit((e)=>{
    e.preventDefault();
    require('./sprites.js');

    Sprite.loadAll($('#load')).then(start);
  })
}

function start(){
  client.connect();

  let loop = new GameLoop('main', 1000/60);
  let gc = new GameCanvas({full: true});
  let playerID = null;
  let myPlayer = null;
  let controls = new ControlInterface(gc, client);
  let damageTimer = 0;


  client.on('connected-to-world', (netID)=>{
    console.log('In World');
    $('#front-screen').hide();
    $('#chat-container').show();
    $('#spell-code-editor,#chat-container').on('keydown keyup keypress', (e)=>e.stopPropagation())
    editor = ace.edit('spell-code-editor', {copyWithEmptySelection: true, mode: 'ace/mode/javascript', theme: 'ace/theme/tomorrow_night_bright'});
    editor.on('change', (e)=>{setTimeout(()=>{
      let oldWidth = Number($("#spell-editor-logo").width());
      if (editor.renderer.gutterWidth !== oldWidth - 1) {
        $("#spell-editor-logo").width((editor.renderer.gutterWidth + 1))
      }
      let size = editor.getSession().getDocument().getValue().length * 2;
      let maxSize = 1600
      $("#spell-space").attr({"max": maxSize, "high": maxSize * 0.8, "low": maxSize * 0.6})
      $("#spell-space").val(size);
      $("#spell-space-text").text(size + "B / " + maxSize + "B");

    }, 20)})
    window.logEditorMessage = (elem)=>{
      let atBottom = $('#spell-editor-log').scrollTop() > document.getElementById('spell-editor-log').scrollHeight - 30;
      $("#spell-editor-log").append("<pre>" + elem + "</pre>");
      if (atBottom) $('#spell-editor-log').scrollTop(document.getElementById('spell-editor-log').scrollHeight);
    }
    client.on('spell-log', (msg)=>logEditorMessage(msg));

    client.on('add-spell', (id)=>{
      console.log("Recieved New Spell");
      $("#spell-select-list").append("<button type='button' class='dropdown-item' data-spell='" + id + "'>" + (Spell.list.get(id)?Spell.list.get(id).name:"Loading...") + "</button>");
    })

    client.on('remove-spell', (id)=>{
      $("#spell-select-list [data-spell='" + id + "']").remove();
    })

    $("#spell-select-list").on('click', 'button.dropdown-item', (e)=>{
      client.send('spell-content-request', $(e.target).data('spell') , (data)=>{
        console.log("Recieved ACK for spell");
        console.log(data);
        if (data != null && data != undefined){
          console.log("Got data");
          $("#spell-select-list .active").removeClass('active');
          $(e.target).addClass('active');
          currentSpell = $(e.target).data('spell');
          editor.getSession().setValue(data);
        }
      })
    })

    $("#spell-compile").click((e)=>{
      client.send('spell-compile', currentSpell, editor.getSession().getValue())
      logEditorMessage("Compiling...")
    })

    $("#new-spell").click((e)=>{
      client.send('new-spell', "Spell" + Spell.list.getIds().length);
    })

    logEditorMessage("<span style='color: #0aa;'>Spell Editor</span> Log <span style='color: orange;'>V1.0.0</span>");
    setTimeout(()=>$("#spell-editor-logo").width((editor.renderer.gutterWidth + 1)), 3)
    require('./chat-window.js');
    playerID = netID;
    let whenDone = (pack)=>{
      myPlayer = Player.list.get(netID);
      if(myPlayer) {
        client.on('player-damage', (data)=>{
          damageTimer = 60;
        })
        client.on('player-killed', (who)=>{
          $('#killed').show().delay(2000).hide('fast');
        })
        client.on('chat-msg', (msg)=>{
          msg.text = msg.text.replace(/\@(\w+)/gi, "<span style='color: #007bff;'>@$1</span>");
          switch (msg.type) {
            case "chat":
              $('#chat').append("<li>&lt;" + msg.who + "&gt; " + msg.text + "</li>");
              break;

            case "command-res":
              $('#chat').append("<li>" + msg.text + "</li>");
              break;

            case "whisper":
              $('#chat').append("<li><em>" + msg.who + " whispers to you: " + msg.text + "</em></li>");
              break;
          }
          if (msg.text.search("@" + myPlayer.name) > -1){ $("#chat li:last-child").flash();}
          $('#chat-section').scrollTop(document.getElementById('chat-section').scrollHeight);
          if ($('#chat-container').is(':hidden')){
            $('#chat-container').fadeIn('fast').delay(5000).fadeOut('slow');
          }
        })
        $("#chat-form").submit((e)=>{
          e.preventDefault();
          client.send('chat-msg', $('#chat-input').val());
          $('#chat-input').val("")
        })

        $("#close-chat").click((e)=>{
          $("#chat-container").fadeOut('fast');
        })

        controls.on('ENTER', ()=>{
          $("#chat-container").clearQueue();
          $("#chat-container").fadeIn('fast');
        })

        controls.mouse.on('wheel', (e)=>{
          if (myPlayer) {
            client.send('player-hotbar-scroll', (Math.floor(e.deltaY / 100)))
          }
        })
        gc.resize();
        gc.camera.setFollow([myPlayer]);
        console.log(gc.camera.follow);
        loop.play();
        client.socket.off("connectionmanager-init", whenDone);
      }
    }
    client.on('connectionmanager-init', whenDone)
  })


  loop.setLoop(()=>{
    //gc.clear();
    gc.begin();
    myPlayer = Player.list.get(playerID);
    gc.background(Sprite.get('background-' + myPlayer.world.netID));
    //console.log(myPlayer.world);
    Wall.list.run('show', gc, myPlayer.world);
    Teleporter.list.run('show', gc, myPlayer.world);
    ItemEntity.list.run('show', gc, myPlayer.world);
    Enemy.list.run('show', gc, myPlayer.world);
    Player.list.run('show', gc, myPlayer.world);
    gc.fill("black");
    gc.font('30px Bungee')
    gc.text(myPlayer.world.displayName, 0,0);
    gc.end();
    gc.stroke('black');
    gc.fill(HEALTH_BG_COLOUR);
    gc.cornerRect(10, 10, 100, 15);
    gc.noStroke();
    gc.fill(HEALTH_COLOUR);
    gc.cornerRect(10,10, (myPlayer.health / myPlayer.maxHealth) * 100, 15);

    let offset = myPlayer.inventory.hotbarSize * 32;
    for (let i = 0; i < myPlayer.inventory.hotbarSize; i ++){
      gc.fill(0,0,0,0.7);
      gc.stroke(128,128,128);
      gc.rect(gc.w/2 - offset + 64 * i, 32, 64, 64);
      if (myPlayer.inventory.hotbar[i]){
        Sprite.get('item-' + myPlayer.inventory.hotbar[i].type).draw(gc, gc.w/2 - offset + 64 * i, 32, 64, 64);
        if (myPlayer.inventory.hotbar[i].count > 1){
          gc.noStroke();
          gc.fill('white');
          gc.text(myPlayer.inventory.hotbar[i].count, gc.w/2 - offset + 64 * i + 20, 10);
        }
      }
    }
    gc.noFill();
    gc.stroke('#ccc');
    gc.ctx.lineWidth = 3;
    gc.rect(gc.w/2 - offset + myPlayer.inventory.selectedSlot * 64, 32, 64, 64);
    gc.ctx.lineWidth = 1;
    controls.endCycle();
    Sprite.endDraw();
  })

  window.onresize = (e)=>{
    gc.resize();
  }


  let user = $('#user').val();
  let pass = $("#pass").val();

  client.send('login', {name: user, pass})
}

window.onload = ready;

//loop.play();
