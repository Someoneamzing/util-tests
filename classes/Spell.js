const {Rectangle, CollisionGroup, ConnectionManager, NetworkWrapper, TrackList} = require('electron-game-util');
const EventEmitter = require('events');
const Entity = require('./Entity.js');
const Player = require('./Player.js');
const ItemEntity = require('./ItemEntity.js');
const Item = require('./Item.js');
const World = require('./World.js');
const Inventory = require('./Inventory.js');
const ItemStack = require('./ItemStack.js');
const fs = require('fs');
const path = require('path');
const {VMScript: BrokenScript, VM: OldVM, NodeVM: OldNodeVM} = require('vm2');

class VMScript extends BrokenScript {
  compile(){
    delete this._compiled;
    return super.compile();
  }
}

class NodeVM extends OldNodeVM {
  updateSandbox(sandbox){
    this.options.sandbox = {...sandbox, ...this.options.sandbox};
    if (this.options.sandbox) {
      if ('object' !== typeof this.options.sandbox) {
        throw new VMError("Sandbox must be object.");
      }

      for (let name in this.options.sandbox) {
        this._internal.Contextify.globalValue(this.options.sandbox[name], name);
      }
    }
  }
}

class VM extends OldVM {
  updateSandbox(sandbox){
    this.options.sandbox = {...sandbox, ...this.options.sandbox};
    if (this.options.sandbox) {
      if ('object' !== typeof this.options.sandbox) {
        throw new VMError("Sandbox must be object.");
      }

      for (let name in this.options.sandbox) {
        this._internal.Contextify.globalValue(this.options.sandbox[name], name);
      }
    }
  }
}

let list = new TrackList(SIDE);

class Spell extends NetworkWrapper(Object, list) {
  constructor(opts = {}){
    super(opts);
    this.source = opts.source||"";
    this.needsRecompile = true;
    this.recompReason = "this being it's first run";
    this.script = null;//new VMScript(this.source,{filename: "UserSpell" + Spell.list.getIds().length});
    this.attack = opts.attack||false;
    this.player = null;
    this.name = opts.name||"";
    this.level = opts.level||"low";

    if (SIDE == ConnectionManager.SERVER)Spell.reporter.newSpell(this);
  }

  getUpdatePkt(){
    let pack = super.getUpdatePkt();
    pack.name = this.name;
    pack.player = this.player;
    pack.attack = this.attack;
    pack.needsRecompile = this.needsRecompile;
    pack.level = this.level;
    return pack;
  }

  getInitPkt(){
    let pack = super.getInitPkt();
    pack.name = this.name;
    pack.player = this.player;
    pack.attack = this.attack;
    pack.needsRecompile = this.needsRecompile;
    pack.level = this.level;
    return pack;
  }

  update(pack){
    if (SIDE == ConnectionManager.CLIENT){
      super.update(pack);
      this.name = pack.name;
      this.player = pack.player;
      this.attack = pack.attack;
      this.needsRecompile = pack.needsRecompile;
      this.level = pack.level;
    }
  }

  remove(){
    Player.list.get(this.player).spells.splice(Player.list.get(this.player).spells.indexOf(this.netID),1);
    super.remove();
  }

  bindToPlayer(p){
    if (p && p.netID != this.player){
      let old = this.player;
      if (old && Player.list.get(old)) Player.list.get(old).spells.splice(Player.list.get(old).spells.indexOf(this.netID),1);
      this.player = p.netID;
      Spell.reporter.spellBindingChange(this, old);
      if (!p.spells.includes(this.netID)) p.spells.push(this.netID);
    }
  }

  setSource(source){
    this.source = source;
    this.needsRecompile = true;
  }

  compile(){
    try{
      if(this.source.match(/while\s*\(\s*true\s*\)/g)){
        throw new SyntaxError("Spell scripts cannot contain while(true) statements")
      }
      if(!this.player){
        let err = new Error("Cannot compile without a player bound");
        err.name = "CompileError";
        throw err;
      }
      let prefix = "";
      let suffix = "\n})";
      switch(this.level){
        case "low":
          prefix = "((player, spell, chat)=>{\n";
          break;
        case "med":
          prefix = "((player, spell, chat, Player)=>{\n"
          break;
        case "admin":
          prefix = "((player, spell, chat)=>{\n"
      }
      this.script = new VMScript(prefix + this.source + suffix,"UserSpell:" + this.netID);
      this.script.compile();
      this.needsRecompile = false;
      Spell.reporter.log(this, "<span style='color: #0a0'>Compiled Successfully!</span>");
    } catch (err) {
      Spell.reporter.error(this, err.name + ": " + err.message);
      this.needsRecompile = true;
      this.recompReason = "an error during compilation. Further info is above. Please fix the issue and recompile"
    }
  }

  execute(sandbox){
    let spell = this;
    Spell.reporter.log(this, "Running spell '" + this.name + "'")
    try{
      if (this.needsRecompile) {
        let err = new Error("Spell must be recompiled before execution. The recompile was requested due to " + this.recompReason + ".");
        err.name = "SpellError";
        throw err;
      }
      sandbox.run(this.script, __filename)(require("./Player.js").list.get(this.player), this, (msg)=>{Spell.reporter.log(spell, "CHAT: " + msg);Command.call("code " + msg, require("./Player.js").list.get(spell.player))}, require("./Player.js"));
    } catch (err) {
      Spell.reporter.error(this, err.name + ": " + err.message);
      this.needsRecompile = true;
    }
  }

  async save(id){
    try {
      try {
        await fs.promises.mkdir('./user-scripts/' + id);
      } catch (err) {
        if (err.code != "EEXIST") throw err;
      }
      let fd = await fs.promises.open('./user-scripts/' + id + "/" + this.name + ".js", "w");
      await fs.promises.writeFile(fd, this.source, {encoding: 'utf-8', flag:"w"});
      fd.close();
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }
}
if (SIDE == ConnectionManager.SERVER){
  class SpellReporter extends EventEmitter {
    constructor(){
      super();

    }

    error(...rest){
      let err = {};
      Error.captureStackTrace(err, this.error)
      this.emit('error', err.stack, ...rest);
    }

    warn(...rest){
      this.emit('warning', ...rest)
    }

    log(...rest){
      this.emit('log', ...rest)
    }

    newSpell(spell){
      this.emit('new-spell', spell);
    }

    spellBindingChange(spell, oldPlayer){
      this.emit('binding-change', spell, oldPlayer);
    }
  }

  class SpellSandboxer {
    constructor(){
      let self = this;
      this._currPlayer = null;
      this._currSpell = null;
      this.envs = [];
      this.envs[0] = new VM({
        timeout: 1000,
        sandbox: {
          console: {
            log: (...rest)=>Spell.reporter.log(this.currSpell, ...rest),
            warn: (...rest)=>Spell.reporter.warn(this.currSpell, ...rest),
            error: (...rest)=>Spell.reporter.error(this.currSpell, ...rest)
          }
        }
      })
      this.envs[1] = new VM({
        timeout: 1000,
        sandbox: {
          console: {
            log: (...rest)=>Spell.reporter.log(this.currSpell, ...rest),
            warn: (...rest)=>Spell.reporter.warn(this.currSpell, ...rest),
            error: (...rest)=>Spell.reporter.error(this.currSpell, ...rest)
          }
        }
      })
      this.envs["admin"] = new NodeVM({
        console: "redirect",
        sandbox: {
          test: "ADMIN"
        },
        require: {
          external: true,
          builtin: ["*"]
        }
      })
      this.envs["admin"].on('console.log',(...rest)=>Spell.reporter.log(this.currSpell, ...rest))
      this.envs["admin"].on('console.info',(...rest)=>Spell.reporter.log(this.currSpell, ...rest))
      this.envs["admin"].on('console.warn',(...rest)=>Spell.reporter.warn(this.currSpell, ...rest))
      this.envs["admin"].on('console.error',(...rest)=>Spell.reporter.error(this.currSpell, ...rest))
    }

    get currPlayer(){
      return this._currPlayer;
    }

    get currSpell(){
      return this._currSpell;
    }

    run(spell){
      this._currSpell = spell;
      spell.execute(this.envs[0])
    }

    runAdmin(spell){
      this._currSpell = spell;

      spell.execute(this.envs['admin'],"admin");
    }
  }

  Spell.reporter = new SpellReporter();
  Spell.sandbox = new SpellSandboxer();
}

list.setType(Spell);

Spell.list = list;


module.exports = Spell;
