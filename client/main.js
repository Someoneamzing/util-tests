const {Client, Sprite, ConnectionManager, ControlInterface, TrackList, NetworkWrapper, Rectangle, Line, Point, Circle, GameLoop, GameCanvas, GUI: GUILoader} = require('electron-game-util');
let GUI;
global.SIDE = ConnectionManager.CLIENT;
require('../config.js');
const path = require('path')
const {dialog} = require('electron');
const fs = require('fs');
const opn = require('opn');
let host = decodeURIComponent(location.hash.slice(1));
require('../ace-src-noconflict/ace.js');
ace.config.set('basePath', path.join(__dirname, "../ace-src-noconflict"))
window.editor = null;
window.currentSpell = null;
tutorialIDLocations = {};

global.markTime = (event, dir)=>{
  if (!DO_CONNECTION_LOG) return;
  let date = new Date().toISOString();
  console.log(date);
  date = date.slice(date.indexOf("T"), date.indexOf("Z"));

  // console.log("( " + date + " ) " + dir + "'" + event + "'")
  fs.writeFileSync(path.join(__dirname, '../connection-log.txt'), "CLIENT: ( " + date + " ) " + dir + "'" + event + "'\n", {encoding: "utf-8", flag: "as"});
}

global.$ = require('jquery');
require('bootstrap');
let client = new Client('http://' + host, 2000);

connection = new ConnectionManager(SIDE, client);

const Entity = require('../classes/Entity.js');
const Wall = require('../classes/Wall.js');
const Player = require('../classes/Player.js');
const Enemy = require('../classes/Enemy.js');
const World = require('../classes/World.js');
const Inventory = require('../classes/Inventory.js');
const ItemEntity = require('../classes/ItemEntity.js');
const Teleporter = require('../classes/Teleporter.js');
const Building = require('../classes/Building.js');
const Counter = require('../classes/Counter.js');
const Chest = require('../classes/Chest.js');
const Spell = require('../classes/Spell.js');
const Arrow = require('../classes/Arrow.js');
const GUIInventory = require('../classes/GUIInventory.js');
// const Robot = require('../classes/Robot.js');
const {jsParser, jsonParser, mdParser} = require('../classes/Syntax.js');

let playerID = null;
let myPlayer = null;

function ready(){


  $('#killed').hide();
  $('#load-container').hide();
  $("#chat-container").hide();
  $("#tutorial-container").hide();
  $("#spell-editor").hide();

  window.notify = (level, title, msg, timeout = 5000)=>{
    let elem = $(
      "<div class='alert alert-" + level + " alert-dismissible fade show'>" +
        "<h5 class='alert-heading'>" + title + "</h5>" +
        "<hr><p class='mb-0'>" + msg + "</p>" +
        "<button type='button' class='close' data-dismiss='alert'>&times;</button>" +
      "</div>"
    ).slideDown('fast').delay(timeout).slideUp('slow', function(){$(this).remove()});
    $("#notifier").prepend(elem)
  }
  connection.addTrackList(Entity.list);
  connection.addTrackList(Wall.list);
  connection.addTrackList(Enemy.list);
  // connection.addTrackList(Robot.list);
  connection.addTrackList(Player.list);
  connection.addTrackList(World.list);
  connection.addTrackList(Inventory.list);
  connection.addTrackList(ItemEntity.list);
  connection.addTrackList(Teleporter.list);
  connection.addTrackList(Building.list);
  connection.addTrackList(Counter.list);
  connection.addTrackList(Chest.list);
  connection.addTrackList(Spell.list);
  connection.addTrackList(Arrow.list);



  require('../items.js')

  require('../guis.js');

  $('#login').submit((e)=>{
    $("#invalid-user-feedback").text("")
    $("#valid-user-feedback").text("")
    $("#invalid-pass-feedback").text("")
    $("#valid-pass-feedback").text("")
    $("#user").get(0).setCustomValidity("");
    $("#pass").get(0).setCustomValidity("");
    e.preventDefault();
    let name = $("#user").val();
    let pass = $("#pass").val();
    if ($("#login").get(0).checkValidity()){
      markTime('login', 'send');
      client.send('login', {name, pass}, (suc, res)=>{
        if (!suc){
          $("#user").get(0).setCustomValidity("Invalid Username");
          $("#invalid-user-feedback").text(res=="Invalid Username"?"The provided username does not macth any existing accounts.":(res=="Player Connected"?"This account is already connected to this server.":""))
          $("#valid-user-feedback").text("");
          $("pass").val("");
          $("#pass").get(0).setCustomValidity("Incorrect Password");
          $("#invalid-pass-feedback").text(res=="Invalid Password"?"Incorrect password.":"")
          $("#valid-pass-feedback").text("");
          $("#login").addClass('was-validated');
        } else {
          $("#login").removeClass('was-validated');
          load();
        }
      });
    } else {
      $("#invalid-user-feedback").text($("#user").get(0).checkValidity()?"":"The provided username does not match requirements. Usernames must only contain letters, numbers and underscores.")
      $("#valid-user-feedback").text("");
      $("#invalid-pass-feedback").text($("#pass").get(0).checkValidity()?"":"The provided password does not match requirements. Passwords must only contain letters, numbers, underscores, and any of these symbols: [!,@,#,$,%,^,&,*], and must be at least 8 characters long.")
      $("#valid-pass-feedback").text("");
      $("#login").addClass('was-validated');
    }

  })

  $("#sign-up").click((e)=>{
    $("#invalid-user-feedback").text("")
    $("#valid-user-feedback").text("")
    $("#invalid-pass-feedback").text("")
    $("#valid-pass-feedback").text("")
    e.preventDefault();
    let name = $("#user").val();
    let pass = $("#pass").val();
    if ($("#login").get(0).checkValidity()){
      markTime('signup', 'send');
      client.send('signup', {name, pass}, (suc, res)=>{
        if (!suc) {
          $("#invalid-user-feedback").text(res == "Username Taken"?"The provided username hs been taken. Please select another.":"")
          $("#valid-user-feedback").text("");
          $("#invalid-pass-feedback").text("")
          $("#valid-pass-feedback").text("");
          $("#login").addClass('was-validated');
        } else {
          notify('success', "Signup Successful", "You can now log in with your new account!", 3000);
        }
      })
    } else {
      $("#invalid-user-feedback").text($("#user").get(0).checkValidity()?"":"The provided username does not match requirements. Usernames must only contain letters, numbers and underscores.")
      $("#valid-user-feedback").text("");
      $("#invalid-pass-feedback").text($("#pass").get(0).checkValidity()?"":"The provided password does not match requirements. Passwords must only contain letters, numbers, underscores, and any of these symbols: [!,@,#,$,%,^,&,*], and must be at least 8 characters long.")
      $("#valid-pass-feedback").text("");
      $("#login").addClass('was-validated');
    }
  })
  client.connect();
}

function load(){
  require('./sprites.js');
  Sprite.loadAll($('#load')).then(start);
}

async function refreshTut(){
  let crawler = (dir)=>{
    let res = "";
    let docs = fs.readdirSync(dir, {encoding: "utf-8", withFileTypes: true});
    for (doc of docs) {
      console.log(doc);
      if (doc.isFile()){
        console.log(doc.name);
        let firstLine = new Uint8Array(100);
        let fd = fs.openSync(path.join(dir, doc.name), "r")
        fs.readSync(fd, firstLine, 0, 100, 0);
        fs.closeSync(fd)
        firstLine = new TextDecoder('utf-8').decode(firstLine)
        res += "<li class='nav-item'><a class='nav-link' data-file='" + path.join(dir, doc.name) + "' href='#'>" + firstLine.slice(1, firstLine.indexOf("\n")) + "</a></li>"
      } else if (doc.isDirectory()) {
        res += "<li class='nav-item'><a class='nav-link folder' href='#'>" + doc.name + "</a><ul class='nav flex-column ml-3'>" + crawler(path.join(dir, doc.name)) + "</ul></li>";
      }
    }
    return res
  }

  let contents = crawler('./client/tutorial/');
  console.log(contents);

  $("#tutorial-contents-list").html(contents);
}

function topOfDoc(){
  $("#tutorial-tab-view").get(0).scrollTop = 0;
  console.log("Scrolling to top");
}

async function loadDoc(file){
  if (file.charAt(0) == "#") {
    file = tutorialIDLocations[file];
  }
  try {
    let data = fs.readFileSync(file, 'utf-8');
    $("#tutorial-tab-view").html(mdParser.parse(data));

    $("#tutorial-tab-view").find("code").replaceWith(function(i){
      let lang = this.getAttribute('data-language')||'javascript';
      console.log(lang);
      let elem = $("<div class='code-example' data-language='" + lang + "'>" + this.innerHTML.replace(/\\r/g, "\r").replace(/\\n/g, "\n") + "</div>");
      console.log("Replacing code");
      return elem;
    })

    $("#tutorial-tab-view").find(".code-example").each((i,elem)=>{
      let content = elem.innerHTML.replace(/\&gt\;/g, ">").replace(/\&lt\;/g, "<");
      console.log("Transforming code to editors");
      let lang = elem.getAttribute('data-language')||'javascript';
      console.log(lang);
      let editor = ace.edit(elem, {copyWithEmptySelection: true, mode: 'ace/mode/' + lang, theme: 'ace/theme/tomorrow_night_bright', readOnly: true});
      editor.setValue(content);
    })

    $("#tutorial-tab-view").data('file', file)
    $("#tutorial-view-link").one('shown.bs.tab', topOfDoc);
    $("#tutorial-view-link").tab('show');
    $("#tutorial-tab-view").get(0).scrollTop = 0;
  } catch (err) {
    notify("danger", "Could not load documentation.", "The documentation file at '" + file + "' could not be loaded. " + err.message, 10000)
    return;
  }
}

function start(){


  let loop = new GameLoop('main', 1000/60);
  let gc = new GameCanvas({full: true});

  global.controls = new ControlInterface(gc, client);
  let damageTimer = 0;

  client.on('chunk-load', (...data)=>{
    console.log("Chunk Load: ", data);
  })

  markTime('connected-to-server', 'on');
  client.on('connected-to-server', (netID, res)=>{
    console.log('In World');
    $('#front-screen').hide();
    $('#chat-container').show();
    $("#spell-editor").css("bottom", "-100%");
    $("#spell-editor").show();
    $("#spell-editor").animate({bottom: "0"}, "slow");

    // $('#tutorial-container').show();
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
      let atBottom = $('#spell-editor-log').scrollTop() > document.getElementById('spell-editor-log').scrollHeight - document.getElementById('spell-editor-log').offsetHeight - 30;
      $("#spell-editor-log").append("<pre>" + elem + "</pre>");
      if (atBottom) $('#spell-editor-log').scrollTop(document.getElementById('spell-editor-log').scrollHeight);
    }
    markTime('spell-log', 'on');
    client.on('spell-log', (msg)=>logEditorMessage(msg));

    markTime('add-spell', 'on');
    client.on('add-spell', (id)=>{
      console.log("Recieved New Spell");
      $("#spell-select-list").append("<button type='button' class='dropdown-item' data-spell='" + id + "'>" + (Spell.list.get(id)?Spell.list.get(id).name:"Loading...") + "</button>");
      setTimeout(()=>{
        $("#spell-select-list [data-spell='" + id + "']").text(Spell.list.get(id).name);
      }, 2000);
    })

    markTime('remove-spell', 'on');
    client.on('remove-spell', (id)=>{
      $("#spell-select-list [data-spell='" + id + "']").remove();
    })

    $("#spell-select-list").on('click', 'button.dropdown-item', (e)=>{
      markTime('spell-content-request', 'send');
      client.send('spell-content-request', $(e.target).data('spell') , (data)=>{
        console.log("Recieved ACK for spell");
        console.log(data);
        if (data != null && data != undefined){
          console.log("Got data");
          $("#spell-select-list .active").removeClass('active');
          $(e.target).addClass('active');
          currentSpell = $(e.target).data('spell');
          $("#spell-select > button").text(Spell.list.get(currentSpell).name)
          editor.getSession().setValue(data);
        }
      })
    })

    $("#spell-compile").click((e)=>{
      markTime('spell-compile', 'send');
      client.send('spell-compile', currentSpell, editor.getSession().getValue())
      logEditorMessage("Compiling...")
    })

    $("#spell-name-form").submit((e)=>{
      e.preventDefault();
      let name = $("#spell-name-input").val();
      if ($("#spell-name-form").get(0).checkValidity() == false) {
        $("#spell-name-form").addClass('was-validated');
        return;
      }
      markTime('new-spell', 'send');
      client.send('new-spell', name);
    })

    $("#run-spell").click((e)=>{
      markTime('run-spell', 'send');
      client.send('run-spell', currentSpell);
    })

    $("#toggle-spell-editor").click(()=>{
      let bottom = $("#spell-editor").css('bottom');
      console.log(bottom);
      console.log($("#spell-editor").get(0).offsetHeight);
      let wasHidden = bottom != "0px";
      if (wasHidden){
        $("#spell-editor").css("bottom", "-" + ($("#spell-editor").get(0).offsetHeight) + "px");
        // $("#spell-editor").show();
        $("#spell-editor").animate({bottom: "0"}, "slow");
      } else {
        $("#spell-editor").css("bottom", "0");
        $("#spell-editor").animate({bottom:  "-" + ($("#spell-editor").get(0).offsetHeight) + "px"}, "slow");
      }
    })

    logEditorMessage("<span style='color: #0aa;'>Spell Editor</span> Log <span style='color: orange;'>V1.0.0</span>");
    setTimeout(()=>$("#spell-editor-logo").width((editor.renderer.gutterWidth + 1)), 3)
    require('./chat-window.js');
    require('./tut-window.js');


    refreshTut();


    $("#tutorial-tab-contents").on("click", ".nav-link[data-file]",(e)=>{
      e.stopPropagation();
      let file = $(e.target).data('file');
      loadDoc(file);
    })

    $("#tutorial-tab-view").on('click', 'a', (e)=>{
      e.preventDefault();
      let href = $(e.target).attr('href');
      if (/^https?:\/\//i.test(href)||path.extname(href) !== ".md"){
        opn(new URL(href, __dirname));
      } else {
        let file = path.join(path.dirname($("#tutorial-tab-view").data('file')),href);
        loadDoc(file);
      }
    })

    $("#refresh-tutorial").click(refreshTut);

    $("#spell-help").click((e)=>{
      $("#tutorial-container").show();
    })

    $("#close-tutorial").click(()=>$("#tutorial-container").hide())


    playerID = netID;
    let whenDone = (pack)=>{
      myPlayer = Player.list.get(netID);
      if(myPlayer) {
        markTime('player-damage', 'on');
        client.on('player-damage', (data)=>{
          damageTimer = 60;
        })
        markTime('player-killed', 'on');
        client.on('player-killed', (who)=>{
          $('#killed').show().delay(2000).hide('fast');
        })
        markTime('chat-msg', 'on');
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
            default:
              $('#chat').append("<li>" + msg.text + "</li>");
          }
          if (msg.text.search("@" + myPlayer.name) > -1){ $("#chat li:last-child").flash();}
          $('#chat-section').scrollTop(document.getElementById('chat-section').scrollHeight);
          if ($('#chat-container').is(':hidden')){
            $('#chat-container').fadeIn('fast').delay(5000).fadeOut('slow');
          }
        })
        $("#chat-form").submit((e)=>{
          e.preventDefault();
          markTime('chat-msg', 'send');
          client.send('chat-msg', $('#chat-input').val());
          $('#chat-input').val("")
        })

        $("#close-chat").click((e)=>{
          $("#chat-container").fadeOut('fast');
        })

        controls.on('ENTER', ()=>{
          $("#chat-container").clearQueue();
          $("#chat-container").fadeIn('fast');
          let $chatInput = $('#chat-input');
          setTimeout($chatInput.focus.bind($chatInput),10);
        })

        controls.mouse.on('wheel', (e)=>{
          if (myPlayer) {
            markTime('player-hotbar-scroll', 'send');
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
    markTime('connectionmanager-init', 'on');
    client.on('connectionmanager-init', whenDone);
    markTime('server-reload', 'on');
    client.on('server-reload', ()=>{
      location.reload();
    })
    connection.connect();
    window.onbeforeunload = (e)=>{
      console.log("Disconnecting...");
      connection.server.socket.disconnect(true);
      // dialog.showMessageBox({title:"Disconnected", message: "The client has disconnected."})
      // e.returnValue = '';
      // return true;
    };
    res(true);

  })


  loop.setLoop(()=>{
    //gc.clear();
    myPlayer = Player.list.get(playerID);
    gc.camera.setFollow([myPlayer]);
    gc.begin();
    gc.background(Sprite.get('background-' + myPlayer.world.netID));

    gc.fill("black");
    gc.noStroke();
    gc.font('30px Bungee')
    gc.text(myPlayer.world.displayName, 0,0);
    //console.log(myPlayer.world);
    Wall.list.run('show', gc, myPlayer.world);
    Arrow.list.run('show', gc, myPlayer.world);
    Teleporter.list.run('show', gc, myPlayer.world);
    Building.list.run('show', gc, myPlayer.world);
    ItemEntity.list.run('show', gc, myPlayer.world);
    Enemy.list.run('show', gc, myPlayer.world);
    // Robot.list.run('show', gc, myPlayer.world);
    Player.list.run('show', gc, myPlayer.world);
    Player.list.run('drawNamePlate', gc, myPlayer.world);
    gc.end();

    //Player health
    gc.stroke('black');
    gc.fill(HEALTH_BG_COLOUR);
    gc.cornerRect(10, 10, 300, 30);
    gc.noStroke();
    gc.fill(HEALTH_COLOUR);
    gc.cornerRect(10,10, (myPlayer.health / myPlayer.maxHealth) * 300, 30);
    gc.fill('black');
    gc.font('14px Arial');
    gc.textAlign('center', 'middle');
    gc.text(`${myPlayer.health}/${myPlayer.maxHealth}`, 150, 25);

    //Player stamina
    gc.stroke('black');
    gc.fill(STAMINA_BG_COLOUR);
    gc.cornerRect(gc.w - 10 - 300, 10, 300, 30);
    gc.noStroke();
    gc.fill(STAMINA_COLOUR);
    gc.cornerRect(gc.w - 10 - 300,10, (myPlayer.stamina / myPlayer.maxStamina) * 300, 30);
    gc.fill('black');
    gc.font('14px Arial');
    gc.textAlign('center', 'middle');
    gc.text(`${myPlayer.stamina}/${myPlayer.maxStamina}`, gc.w - 10 - 150, 25);

    let offset = (myPlayer.inventory.hotbar.length - 1) * 32;
    for (let i = 0; i < myPlayer.inventory.hotbar.length; i ++){
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


  markTime('loaded', 'send');
  client.send('loaded');

}

window.onload = ready;

//loop.play();
