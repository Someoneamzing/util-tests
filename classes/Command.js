class Command {
  constructor(...params){
    this.key = params[0];
    this.multiArgs = params[1];
    this.template = [];
    for (let i = 2; i < params.length; i ++){
      let p = params[i];
      this.template[i - 2] = {};
      let t = this.template[i - 2];
      t.type = p.type;
      t.name = p.name;
      t.values = p.values;
      t.range = p.range;
    }
    console.log(this.template);
    this.handle = ()=>{
      return "<span style='color: red;'>Unknown error in command execution.</span>"
    }
    Command.list[this.key] = this;
  }

  setHandle(f){
    this.handle = f;
  }

  call(c, player) {
    let args = {};
    if (this.multiArgs) {
      let from = 0;
      let res = Command.findMatchingPair(c.substring(from), "{", "}");
      while (res) {
        c = c.substring(0,res.start) + res.string.replace(" ", "​") + c.substring(res.end + 1);
        from = res.end;
        res = Command.findMatchingPair(c.substring(from), "{", "}");
      }
      c = c.split(" ");
    } else {c = [" ",c.replace(this.key + " ", "")];};
    console.log(c);
    for (let i = 1; i < c.length; i ++){
      c[i] = c[i].replace("​", " ");
      console.log(i);
      let t = this.template[i - 1];
      console.log(t);
      console.log(c[i]);
      if (t.values && !t.values.includes(c[i])) return "<span style='color: red;'>" + t.name + " must be one of " + t.values.reduce((r,v,s)=>{return r + (s!=t.values.length-2?(s != t.values.length - 1?v + ", ": v ): v + " or ")}, "") + "</span>";
      if (t.type == 'number' && ((t.range && (t.range.min?t.range.min:-Infinity > c[i]||t.range.max?t.range.max:Infinity < c[i])||isNaN(c[i])))) {
        let problem;
        if (t.range && typeof t.range.max == 'undefined' && typeof t.range.min != "undefined"){
          problem = "greater than " + t.range.min + ".";
        } else if (t.range && typeof t.range.min == 'undefined' && typeof t.range.max != "undefined") {
          problem = "less than " + t.range.max + ".";
        } else if (t.range && typeof t.range.min != 'undefined' && typeof t.range.max != "undefined"){
          problem = "between " + t.range.min + " and " + t.range.max;
        } else {
          problem = "";
        }
        return "<span style='color: red;'>" + t.name + " must be a number" + problem + ".</span>"
      }
      switch(t.type){
        case "number":
          args[t.name] = Number(c[i]);
          break;
        case "string":
          args[t.name] = "" + c[i];
          break;
        case "JSON":
          console.log(c[i]);
          args[t.name] = JSON.parse(c[i]);
          break;
      }
    }

    console.log(args);
    return this.handle(args, player);
  }

  static call(c, player){
    let com = Command.get(c.indexOf(" ") >= 0?c.slice(0,c.indexOf(" ")):c);
    if (com) {
      return com.call(c, player);
    } else {
      return "<span style='color: red;'>Unknown command '" + c.slice(0,c.indexOf(" ")) + "'.</span>";
    }
  }

  static get(key){
    return Command.list[key];
  }

  static findMatchingPair(text, start, end) {
    let level = 0;
    let startI = 0;
    for (let i = 0; i < text.length; i ++) {
      let char = text.charAt(i);
      if (char == "\\") i ++;
      if (char == start) {
        level ++;
        if (level == 1) {
          startI = i;
        }
      }
      // FIXME: Not correctly marking the pairs.
      if (char == end) {
        level --;
        console.log(startI, i, level);
        if (level == 0) return {start: startI, end: i, string: text.substring(startI,i + 1)};
      }

    }
    return null;
  }
}

Command.list = {};

module.exports = Command;
