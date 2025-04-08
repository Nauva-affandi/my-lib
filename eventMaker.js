export class eventMaker {
  constructor(parentSelector) {
    this.parent = document.querySelector(parentSelector);
    if (!this.parent) {
      throw new Error(`Parent "${parentSelector}" tidak ditemukan!`);
    }
    this.events = {};
    this.intervals = {};
  }

  on(eventType, childSelector, callback) {
    if (!this.events[eventType]) {
      this.events[eventType] = {};
    }

    if (!this.events[eventType][childSelector]) {
      this.events[eventType][childSelector] = [];
    }

    this.events[eventType][childSelector].push(callback);
    
    if (!document.querySelector(childSelector)) {
      this.checkElementExists(eventType, childSelector);
    } else {
      this.addEventListener(eventType, childSelector);
    }
  }

  checkElementExists(eventType, childSelector) {
    if (this.intervals[childSelector]) {
      return;
    }

    let attempts = 0;
    const maxAttempts = 40;
    const intervalMs = 1500;

    this.intervals[childSelector] = setInterval(() => {
      if (document.querySelector(childSelector)) {
        clearInterval(this.intervals[childSelector]);
        delete this.intervals[childSelector];
        this.addEventListener(eventType, childSelector);
      } else if (++attempts >= maxAttempts) {
        clearInterval(this.intervals[childSelector]);
        delete this.intervals[childSelector];
      }
    }, intervalMs);
  }

  addEventListener(eventType, childSelector) {
    if (!this.events[eventType]?.[childSelector]) {
      return;
    }

    const handler = (event) => {
      const target = event.target.closest(childSelector);
      if (target && this.parent.contains(target)) {
        this.events[eventType][childSelector].forEach(callback =>
          callback(event, target)
        );
      }
    };

    this.events[eventType][childSelector].handler = handler;
    this.parent.addEventListener(eventType, handler);
  }

  off(eventType, childSelector) {
    if (!this.events[eventType]?.[childSelector]) {
      return;
    }

    this.parent.removeEventListener(
      eventType,
      this.events[eventType][childSelector].handler
    );
    
    delete this.events[eventType][childSelector];
    if (Object.keys(this.events[eventType]).length === 0) {
      delete this.events[eventType];
    }
  }
}