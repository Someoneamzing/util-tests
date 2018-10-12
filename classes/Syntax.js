class Element {
  constructor(token, blocking, handler){
    this.token = token;
    this.handler = handler.bind(this);
    this.blocking = blocking;
  }

  process(found){
    return this.handler(found);
  }
}

class Parser {
  constructor(){
    this.elements = [];
  }

  addElement(element){
    this.elements.push(element);
    return this.elements[this.elements.length-1];
  }

  parse(data){

    for (let e of this.elements) {
      for (let prop in e.volatiles){
        e[prop] = e.volatiles[prop];
      }
      data = data.replace(e.token, (found, ...groups)=>{
        let offset = groups[groups.length-2];
        if(e.blocking){
          return "\n</p>" + e.process(found) + "<p>\n";
        } else return e.process(found);
      });
    }

    data = data.replace(/\<p\>(?:(?:\r\n|\r|\n)+)?<\/p>/gm, "");

    return data;
  }
}

let jsParser = new Parser();

jsParser.addElement(new Element(/(\<|\>)/g, false, function(found){
  return "&" + (found == "<"?"lt":"gt") + ";";
}))

jsParser.addElement(new Element(/(["'])(?:\\\1|.)*?\1/gm,false,function(found){
  return "<span style=\'color: lime;\'>" + found + "</span>";
}));

jsParser.addElement(new Element(/(\d+(\.\d+)*)/g, false, function(found){
  return "<span style=\'color: orange;\'>" + found + "</span>";
}))

jsParser.addElement(new Element(/(new|function|class|in|of|if|else|switch|case|default|return|break|continue|throw|let|const|var|for|\=\>)/g, false, function(found){
  return "<span style=\'color: #c34ed0;\'>" + found + "</span>";
}))

let jsonParser = new Parser();

module.exports = {Parser, Element, jsParser, jsonParser};
