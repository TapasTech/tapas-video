export default class EventEmitter {
  constructor() {
    this.events = {};
  }

  on(name, listener) {
    let list = this.events[name];
    if (!list) {
      list = this.events[name] = [];
    }
    list.push(listener);
  }

  off(name, listener) {
    const list = this.events[name];
    if (list) {
      if (listener) {
        const i = list.indexOf(listener);
        ~i && list.splice(i, 1);
      } else {
        list.splice(0);
      }
    }
  }

  emit(name, ...args) {
    const list = this.events[name] || [];
    list.forEach(listener => listener(...args));
  }
}
