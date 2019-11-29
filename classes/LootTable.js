const ItemStack = require('./ItemStack.js');
const fs = require('fs').promises;
const path = require('path');
class LootTable {
  constructor(name, definition) {
    this.pools = definition.pools;
    for (let pool of this.pools) {
      let N = pool.entries.length;
      let weights = pool.entries.map(e=>e.weight||1);
      let sum = weights.reduce((acc, e)=>acc + e, 0);
      let avg = sum / N;
      let aliases = pool.aliases = new Array(N).fill([1,null], 0, N);
      let smalls = [];
      let bigs = [];
      for (let i in weights) {
        let w = weights[i];
        if (w < avg) {smalls.push([i, w/avg])} else bigs.push([i,w/avg]);
      }
      let sIter = smalls.values();
      let bIter = bigs.values();
      let small = sIter.next().value;
      let big = sIter.next().value;
      while(small && big) {
        aliases[small[0]] = [small[0], big[0]];
        big = [big[0], big[1] - (1-small[1])];
        if (big[1] < 1) {
          small = big;
          big = bIter.next().value;
        } else {
          small = sIter.next().value;
        }
      }
    }
    this.name = name;
    LootTable.list.set(name, this);
  }

  generate(){
    let generated = [];
    for (let pool of this.pools) {
      let rolls = Math.max(0, isNaN(pool.rolls)?Math.floor(Math.random() * (pool.rolls.max + 1 - pool.rolls.min)) + pool.rolls.min:pool.rolls);
      for (let i = 0; i < rolls; i ++) {
        let r = Math.random() * pool.entries.length;
        let i = Math.floor(r)
        let [odds, alias] = pool.aliases[i];
        let picked = (r-i) > odds ? alias : i;
        let entry = pool.entries[picked];
        switch(entry.type) {
          case "item":
            let stack = new ItemStack(entry.name, 1);
            for(let f of entry.functions) {
              LootTable.functions.get(f.function)(stack, f);
            }
            generated.push(stack);
            break;
          case "loot_table":
            generated.push(...LootTable.list[entry.name].generate());
            break;
        }
      }
    }
    let total = generated.reduce((acc,e)=>{
      if (e.type in acc) {
        e.remove(acc[e.type][acc[e.type].length - 1].add(e.count));
        while (e.count > 0) {
          acc[e.type].push(new ItemStack(e.type, 0))
          e.remove(acc[e.type][acc[e.type].length - 1].add(e.count));
        }
      } else {
        acc[e.type] = [e];
      }
      return acc;
    }, {});
    let out = [];
    for (let type in total) {
      out.push(...(total[type].filter(e=>(e.count > 0))));
    }
    return out;
    // return generated;
  }

  static async loadDirectory(namespace, dir) {
    console.log("Loading folder " + dir + " under namespace " + namespace);
    let proms = [];
    let crawler = async (route) => {
      let cont = await fs.readdir(path.join(dir, route), {withFileTypes: true});
      for (let e of cont) {
        console.log(e.name);
        if (e.isFile()) {
          console.log("Is file");
          if (path.extname(e.name) == ".json") {
            console.log("Making table " + e.name);
            proms.push(fs.readFile(path.join(dir, route, e.name), 'utf-8').then((data)=>{
              console.log("Table " + e.name + " made as " + namespace + ":" + path.join(route, e.name.replace(/\..+/g, "")));
              new LootTable(namespace + ":" + path.join(route, e.name.replace(/\..+/g, "")).replace(/\\/g, "/"), JSON.parse(data))
            }));
          }
        } else if (e.isDirectory()) {
          await crawler(path.join(route, e.name));
        }
      }
    }
    await crawler("");
    await Promise.all(proms);
  }

  static get(name) {
    return LootTable.list.get(name) || null;
  }
}

LootTable.list = new Map();

LootTable.functions = new Map();

LootTable.functions.set('set_count', (stack, options)=>{
  console.log("set_count", stack, options);
  let count = isNaN(options.count)?(Math.floor(Math.random() * (options.count.max + 1 - options.count.min)) + options.count.min):options.count;
  console.log(count);
  stack.set(count);
})

module.exports = LootTable;
