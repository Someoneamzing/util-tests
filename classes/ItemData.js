class ItemData {
  constructor(data = {}){
    if (typeof data == "string") {
      data = JSON.parse(data);
    }
    if (typeof data == "object") {
      if (data !== null) {
        this.root = new CompoundTag(data);
      } else {
        throw new ItemDataParseError("Attempted to construct ItemData from null");
      }
    } else {
      throw new ItemDataParseError("Attempted to construct ItemData from incompatible type");
    }
  }

  isDirty(){
    return this.root.isDirty();
  }

  setKey(key, data){
    this.root.setKey(key, data);
  }

  removeKey(key) {
    this.root.removeKey(key);
  }

  getKey(key){
    return this.root.getKey(key);
  }

  toJSON() {
    return this.root.toJSON();
  }

  matches(data) {
    return JSON.stringify(this) == JSON.stringify(data);
  }
}

class CompoundTag {
  constructor(data) {
    this.tag = new Map();
    this.tagChildren = new Set();
    this.dirty = false;
    if (data) {
      if (typeof data === 'object' && data !== null) {
        let keys = Object.keys(data).sort();
        for (let key of keys) {
          this.setKey(key, data[key]);
        }
      } else {
        throw new ItemDataParseError("Attempted to construct CompoundTag from non object: '" + data.toString() + "'");
      }
    }
  }

  [Symbol.iterator](){
    return this.tag.entries();
  }

  isDirty(){
    if (this.dirty || Array.from(this.tagChildren).some(e=>this.tag.get(e).isDirty())) {
      this.dirty = false;
      return true;
    }
    return false;
  }

  setKey(key, data){
    switch (typeof data) {
      case "string":
      case "number":
      case "boolean":
        this.tag.set(key, data);
        this.dirty = true;
        break;
      case "object":
        this.tag.set(key, new (ListTag.isIterable(data)?ListTag:CompoundTag)(data));
        this.tagChildren.add(key);
        this.dirty = true;
        break;
      default:
        throw new ItemDataParseError("Attempted to parse data point of incompatible type '" + typeof data + "'.");
    }
  }

  removeKey(key) {
    this.tag.delete(key);
    this.dirty = true;
    this.tagChildren.delete(key);
  }

  getKey(key){
    return this.tag.has(key)?this.tag.get(key):null;
  }

  toJSON(){
    let res = {};
    let keys = Array.from(this.tag.keys()).sort();
    for (let key of keys) {
      res[key] = this.tag.get(key);
    }
    return res;
  }


}

class ListTag {
  constructor(data) {
    this.tag = new Array();
    this.tagChildren = new Set();
    this.dirty = false;
    if (ListTag.isIterable(data)) {
      for (let item of data) {
        this.addItem(item);
      }
    } else {
      throw new ItemDataParseError("Attempted to construct ListTag from non-iterable");
    }
  }

  isDirty(){
    if (this.dirty || Array.from(this.tagChildren).some(e=>this.tag[e].isDirty())) {
      this.dirty = false;
      return true;
    }
    return false;
  }

  [Symbol.iterator]() {
    return this.tag.values();
  }

  addItem(data){
    switch (typeof data) {
      case "string":
      case "number":
      case "boolean":
        this.tag.push(data);
        this.dirty = true;
        break;
      case "object":
        this.tagChildren.add(this.tag.push(new (ListTag.isIterable(data)?ListTag:CompoundTag)(data)) - 1);
        this.dirty = true;
        break;
      default:
        throw new ItemDataParseError("Attempted to parse data point of incompatible type '" + typeof data + "'.");
    }
  }

  getItem(i) {
    return i in this.tag?this.tag[i]:null;
  }

  setItem(key, data){
    if (key > this.tag.length) {
      throw new IndexOutOfBoundsError("Index '" + key + "' is out of bounds for list of length '" + this.tag.length + "'");
    } else {
      switch (typeof data) {
        case "string":
        case "number":
        case "boolean":
          this.tag[key] = data;
          this.dirty = true;
          break;
        case "object":
          this.tag[key] = new (ListTag.isIterable(data)?ListTag:CompoundTag)(data);
          this.tagChildren.add(key);
          this.dirty = true;
          break;
        default:
          throw new ItemDataParseError("Attempted to parse data point of incompatible type '" + typeof data + "'.");
      }
    }
  }

  removeItem(i) {
    if (i >= this.tag.length) {
      throw new IndexOutOfBoundsError("Index '" + i + "' is out of bounds for list of length '" + this.tag.length + "'");
    } else {
      this.tag.splice(i,1);
      this.dirty = true;
      if (this.tagChildren.has(i)) {
        this.tagChildren.remove(i);
        for (let value of this.tagChildren.values()){
          if (value > i) {
            this.tagChildren.delete(value);
            this.tagChildren.add(value -1);
          }
        }
      }
    }
  }

  get length(){
    return this.tag.length;
  }

  static isIterable(a) {
    if (a == null) {
      return false;
    }
    return typeof a[Symbol.iterator] === 'function';
  }

  toJSON(){
    return this.tag;
  }
}

class ItemDataParseError extends Error {
  constructor(message){
    super(message);
  }
}

class IndexOutOfBoundsError extends Error {}

module.exports = ItemData;
