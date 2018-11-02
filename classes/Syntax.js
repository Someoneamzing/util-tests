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

let mdParser = new Parser();

// mdParser.addElement();

  mdParser.addElement(new Element(/\&\#[\dabcdefABCDEF]{2,4};/g, false, function(found){
    return "<entity>" + found.replace(/\&\#/g, "") + "</entity>";
  }))

  mdParser.addElement(new Element(/(^> ?(?:\r\n|\r|\n|.)+?)(?=(?:\r\n|\r|\n){2,})/gm, true, function(found){
    found = found.replace(/>\s*/g, "");
    console.log(found);
    found = found.replace(/(?:\r\n|\r|\n)/g, "<br>");
    console.log(found);
    return "<blockquote>" + found + "</blockquote>";
  }))

  mdParser.addElement(new Element(/```(?:\r\n|\r|\n)(((?:\r\n|\r|\n)|.)+?)(?:\r\n|\r|\n)```/mg, true, function(found){
    let res = "<code>";
    found = found.replace(this.token, "$1");
    found = found.replace(/\r/g, "\\r");
    found = found.replace(/\n/g, "\\n");
    found = found.replace(/\*/g, "&#42;")
    res += found + "</code>";
    return res;
  }))

  mdParser.addElement(new Element(/((\|[^|\r\n]*)+\|(\r?\n|\r))+/gm, true, function(found){
    let res = "<table class='table'><thead><tr>";
    found = found.trim();
    console.log(found);
    let rows = found.split(/(?:\r?\n|\r)/g).map((row)=>{
      row = row.slice(row.indexOf("|") + 1);
      row = row.slice(0,row.lastIndexOf("|"))
      return row.split("|");
    });
    let alignments = rows[1].map((contents)=>{
      if ((/\:\-+\:/).test(contents)) {
        return "center";
      } else if ((/\:\-+/).test(contents)) {
        return "left";
      } else if ((/\-+\:/).test(contents)) {
        return "right";
      }
      return "inherit";
    })

    for (let i in rows[0]){
      let cell = rows[0][i];
      res += "<th style='text-align: " + alignments[i] + "'>" + cell + "</th>";
    }

    res += "</tr></thead><tbody>";

    for (let i = 2; i < rows.length; i ++){
      res += "<tr>"
      let row = rows[i];
      for (let j in row) {
        let cell = row[j];
        res += "<td style='text-align: " + alignments[j] + "'>" + cell + "</td>"
      }
      res += "</tr>"
    }

    return res + "</tbody></table>"
  }))

  mdParser.addElement(new Element(/`(.+?)`/g, false, function (found){
    let res = "<samp>";
    found = found.replace(this.token, "$1");
    res += found + "</samp>";
    return res;
  }))

  mdParser.addElement(new Element(/#+(.+?)(?=\r\n|\r|\n)/g, true, function(found){
    let lev = found.match(/\#+/i)[0].length;
    console.log("Heading Level: ", lev);
    found = found.replace(/\#+/i, "");
    return "<h" + lev + " class='rule'>" + found + "</h" + lev + ">"
  }))

  mdParser.addElement(new Element(/!\[(.+?)\]\((.+?)\)/g, false, function(found){
    console.log(found);
    let alt = found.replace(this.token, "$1");
    console.log("Alt: ",alt);
    let url = found.replace(this.token, "$2");
    console.log("URL: ",url);
    return "<img src='" + url + "' alt='" + alt + "'>";
  }))

  mdParser.addElement(new Element(/\[(.+?)\]\((.+?)(?:\s["']([\w\s\d]+)["'])?\)/g, false, function(found){
    console.log(found);
    let alt = found.replace(this.token, "$1");
    console.log(alt);
    let url = found.replace(this.token, "$2");
    let title = found.replace(this.token, "$3");
    return "<a href='" + url + "' title='" + title + "'>" + alt + "</a>";
  }))

  mdParser.addElement(new Element(/(?:\r\n|\r|\n)+((?:\d+\. .+(?:\r\n|\r|\n)?)+)/mg, true, function(found){
    console.log(found);
    let items = found.replace(this.token, "$1").trim();
    console.log(items);
    items = items.split(/(?:\r\n|\r|\n)/);
    console.log(items);
    return items.reduce((t,c)=>{
      t += "<li>" + c.replace(/\d+\.\s/, "") + "</li>";
      return t;
    }, "<ol>") + "</ol>";
  }))

  mdParser.addElement(new Element(/(?:\r\n|\r|\n)+((?:\- .+(?:\r\n|\r|\n)?)+)/mg, true, function(found){
    console.log(found);
    let items = found.replace(this.token, "$1").trim();
    console.log(items);
    items = items.split(/(?:\r\n|\r|\n)/);
    console.log(items);
    return items.reduce((t,c)=>{
      t += "<li>" + c.replace(/\-\s/, "") + "</li>";
      return t;
    }, "<ul>") + "</ul>";
  }))

  mdParser.addElement(new Element(/(?:\r\n|\r|\n)+((?:\[([x ])\] .+(?:\r\n|\r|\n)?)+)/mg, true, function(found){
    console.log(found);
    let items = found.replace(this.token, "$1").trim();
    console.log(items);
    items = items.split(/(?:\r\n|\r|\n)/);
    console.log(items);
    return items.reduce((t,c)=>{
      t += "<li>" + c.replace(/\[([x ])\]/gm, (found, ...groups)=>{
        return "<input type='checkbox' disabled " + (groups[0]=="x"?"checked":"") + ">";
      }) + "</li>";
      return t;
    }, "<ul>") + "</ul>";
  }))

  mdParser.addElement(new Element(/(?:\r\n|\r|\n)\-{3,}(?:\r\n|\r|\n)/gm, true, function(){
    return "<hr>";
  }))

  mdParser.addElement(new Element(/\*{2}(.+)\*{2}/g, false, function(found){
    found = found.replace(this.token, "$1");
    return "<strong>" + found + "</strong>"
  }));

  mdParser.addElement(new Element(/\*(.+?)\*/g, false, function(found){
    found = found.replace(this.token, "$1");
    return "<i>" + found + "</i>"
  }));

  let footnoteRef = mdParser.addElement(new Element(/\[\^([\w\d]+?)\](?!\:)/g, false, function(found){
    found = found.replace(this.token, "$1");
    let number = ++this.totalNotes;
    this.numbers[found] = number;
    return "<sup><a href='#fn-" + found + "' id='fnref-" + found + "'>" + (number) + "</a></sup>";
  }));

  footnoteRef.totalNotes = 0;
  footnoteRef.numbers = {};
  footnoteRef.volatiles = {"totalNotes": 0, "numbers": {}}

  mdParser.addElement(new Element(/\[\^([\w\d]+?)\]\:(?:(.+)((?:(?:\r?\n|\r)+(?: {2,}|\t+)(?:.+))+)?)/gm, true, function(found){
    let from = found.replace(this.token, "$1");
    let lead = found.replace(this.token, "$2");
    let text = found.replace(this.token, "$3");
    console.log("From: ", from);
    console.log("Lead: ", lead);
    console.log("Text: ", text);
    let number = footnoteRef.numbers[from];
    return "<details class='fn' id='fn-" + from + "'><summary><span class='fn-num'>" + number + ".</span>" + lead + "<a href='#fnref-" + from + "' class='fn-backref'>&nbsp↩</a></summary><p>" + text + "</p></details>";
  }))

  mdParser.addElement(new Element(/\^\((.+?)\)\^/g, false, function(found){
    let content = found.replace(this.token, "$1");
    return "<sup>" + content + "</sup>";
  }))

  mdParser.addElement(new Element(/\^(.+?)\^/g, false, function(found){
    let title = found.replace(this.token, "$1");
    let abbr = title.replace(/[a-z\s]/g, "");
    return "<abbr title='" + title + "'>" + abbr + "</abbr>"
  }))

  //---Keep Last ---------
  mdParser.addElement(new Element(/<entity>([\dabcdefABCDEF]{2,4};)<\/entity>/g, false, function(found){
    return "&#" + found.replace(this.token, "$1");
  }))

  mdParser.addElement(new Element(/(\r\n|\r|\n){3,}/mg, true, function(found){return "";}));

  mdParser.addElement(new Element(/\s\s(\r\n|\r|\n)/mg, false, function(found){return "<br>";}));

module.exports = {Parser, Element, jsParser, jsonParser, mdParser};
