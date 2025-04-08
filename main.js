export function cloneDeep(value) {
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(cloneDeep);
  }
  if (value instanceof Date) {
    return new Date(value.getTime());
  }
  if (value instanceof RegExp) {
    return new RegExp(value.source, value.flags);
  }
  const clonedObj = {};
  for (const key in value) {
    if (value.hasOwnProperty(key)) {
      clonedObj[key] = cloneDeep(value[key]);
    }
  }
  return clonedObj;
}

export class createBus {
  constructor() {
    this.events = {};
  }

  on(event, callback) {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(callback);
  }

  emit(event, data) {
    if (this.events[event]) {
      this.events[event].forEach((callback) => callback(data));
    }
  }

  off(event) {
    if (this.events[event]) {
      delete this.events[event];
    }
  }
}

export function createElement(f, options) {
  let t = typeof f == "string" ? document.querySelector(f) : f;
  if (!t) return console.error("Parent element not found!");

  let element;
  if (options.clone) {
    let r = document.querySelector(options.clone);
    if (!r) return console.error("Element to clone not found!");
    element = r.cloneNode(true);
  } else {
    element = document.createElement(options.tag || "div");
  }

  if (options.html) {
    element.innerHTML = options.html;
  } else if (options.text) {
    element.textContent = options.text;
  }

  if (options.attrs) {
    for (let r in options.attrs) {
      if (r === "class") {
        options.classMode === "replace"
          ? (element.className = options.attrs[r])
          : element.classList.add(...options.attrs[r].split(" "));
      } else {
        element.setAttribute(r, options.attrs[r]);
      }
    }
  }

  if (options.id) element.id = options.id;
  if (options.class) element.className = options.class;
  if (options.toggleClass) element.classList.toggle(options.toggleClass);

  if (options.dataset) {
    for (let r in options.dataset) {
      element.dataset[r] = options.dataset[r];
    }
  }

  if (options.style) {
    for (let r in options.style) {
      element.style[r] = options.style[r];
    }
  }

  if (options.events) {
    for (let r in options.events) {
      element.addEventListener(r, options.events[r]);
    }
  }

  if (options.children) {
    options.children.forEach((r) => n(element, r));
  }

  if (options.callback) options.callback(element);
  
  if (options.replaceWith) {
    let r = document.querySelector(f);
    if (r) r.replaceWith(element);
  }

  let a = () => {
    if (options.replace) {
      t.innerHTML = "";
      t.appendChild(element);
    } else if (options.insertBefore) {
      let r = document.querySelector(options.insertBefore);
      r ? t.insertBefore(element, r) : console.warn("Reference element for insertBefore not found!");
    } else if (options.insertAfter) {
      let r = document.querySelector(options.insertAfter);
      r && r.parentNode
        ? r.parentNode.insertBefore(element, r.nextSibling)
        : console.warn("Reference element for insertAfter not found!");
    } else if (options.insertInto) {
      let r = document.querySelector(options.insertInto);
      r ? r.appendChild(element) : console.warn("Reference element for insertInto not found!");
    } else if (options.moveTo) {
      let r = document.querySelector(options.moveTo);
      r ? t.appendChild(r) : console.warn("Element to move not found!");
    } else if (options.prepend) {
      t.prepend(element);
    } else {
      t.appendChild(element);
    }

    if (options.unwrap) {
      let r = t.parentNode;
      if (r) {
        while (t.firstChild) {
          r.insertBefore(t.firstChild, t);
        }
        t.remove();
      }
    }

    if (options.removeAfter) {
      setTimeout(() => element.remove(), options.removeAfter);
    }
  };

  if (options.waitBeforeAppend) {
    setTimeout(a, options.waitBeforeAppend);
  } else {
    a();
  }
}

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

export function createRef(initialValue, maxHistory = 5) {
  const state = {
    value: cloneDeep(initialValue),
    listeners: new Map(),
    history: [],
    initialClone: cloneDeep(initialValue),
    watchActiveMap: new Map(),
    defaultWatchId: "main",
    batching: false,
    batchQueued: false,
  };

  const proxyHandler = {
    set: (target, prop, newValue) => {
      if (target[prop] !== newValue) {
        target[prop] = newValue;
        if (!state.batching) notify();
        else state.batchQueued = true;
      }
      return true;
    },
  };

  function notify() {
    if (state.batchQueued) {
      state.batchQueued = false;
    } else {
      return;
    }

    state.listeners.forEach((listeners, watchId) => {
      if (state.watchActiveMap.get(watchId) === false) return;
      listeners.forEach(({ handler, config }) => {
        executeHandler(handler, config, state.value);
      });
    });
  }

  function executeHandler(handler, config, newValue) {
    const now = Date.now();
    if (config.throttleTime > 0 && now - config.lastCalled < config.throttleTime) return;
    config.lastCalled = now;

    let valueToPass = config.trackPath ? getNestedValue(newValue, config.trackPath) : newValue;
    let oldValueToPass = config.trackPath ? getNestedValue(config.lastValue, config.trackPath) : config.lastValue;

    const runHandler = () => {
      if (config.callCount >= config.maxCalls) {
        removeListener(handler);
        return;
      }
      try {
        handler(valueToPass, oldValueToPass);
        config.callCount++;
        if (config.callCount >= config.maxCalls) removeListener(handler);
      } catch (error) {
        console.error(error.message);
      }
      config.lastValue = cloneDeep(newValue);
    };

    if (config.delayTime > 0) {
      clearTimeout(config.timeout);
      config.timeout = setTimeout(runHandler, config.delayTime);
    } else {
      runHandler();
    }
  }

  function getNestedValue(obj, path) {
    if (typeof path !== "string") throw new Error("Path harus string.");
    const keys = path.split(".").map((key) => key.trim());
    let current = obj;
    for (const key of keys) {
      if (current === undefined || current === null) {
      	throw new Error(`Path '${path}' invalid.`);
      }
      if (Array.isArray(current) && !/^\d+$/.test(key)) throw new Error(`'${key}' bukan indeks array.`);
      if (Array.isArray(current)) current = current[Number(key)];
      else if (Object.prototype.hasOwnProperty.call(current, key)) current = current[key];
      else throw new Error(`Properti '${key}' tidak ditemukan.`);
    }
    return current;
  }

  function removeListener(handler, watchId) {
    if (!state.listeners.has(watchId)) return;
    const listeners = state.listeners.get(watchId).filter((l) => l.handler !== handler);
    if (listeners.length === 0) {
      state.listeners.delete(watchId);
      state.watchActiveMap.delete(watchId);
    } else {
      state.listeners.set(watchId, listeners);
    }
  }

  function saveHistory() {
    if (state.history.length >= maxHistory) { state.history.shift();
    }
    state.history.push(cloneDeep(state.value));
  }

  function getReactiveValue(val) {
    if(typeof val === "object" && val !== null) {
    	return new proxy(val, proxyHandler)
    } else {
    	return val
    }
  }

  function convertValue(newValue) {
    return getReactiveValue(cloneDeep(newValue));
  }

  function update(action, silent = false) {
    saveHistory();
    action();
    if (!silent && !state.batching) notify();
    else state.batchQueued = true;
  }

  function method(silent = false) {
    return {
      get value() {
        return state.value;
      },
      set value(newValue) {
        update(() => (state.value = convertValue(newValue)), silent);
      },
      set(newValue) {
        update(() => (state.value = convertValue(newValue)), silent);
      },
      undo() {
        update(() => {
          if (state.history.length > 0) state.value = getReactiveValue(state.history.pop());
        }, silent);
      },
      reset() {
        update(() => (state.value = getReactiveValue(clone(state.initialClone))), silent);
      },
      unwatch(watchId) {
        state.watchActiveMap.set(watchId || state.defaultWatchId, false);
        return this;
      },
      jalankanWatch(watchId) {
        state.watchActiveMap.set(watchId || state.defaultWatchId, true);
        return this;
      },
      batch(fn) {
        state.batching = true;
        fn();
        state.batching = false;
        if (state.batchQueued) notify();
      }
    };
  }

  function watch(target, callback = null) {
    let cb = callback || target;
    let trackPath = callback ? target : null;
    let watchId = state.defaultWatchId;

    const config = {
      trackPath,
      throttleTime: 0,
      delayTime: 0,
      lastCalled: 0,
      timeout: null,
      callCount: 0,
      maxCalls: 1,
      lastValue: cloneDeep(state.value),
      watchId
    };

    function handler(newValue, oldValue) {
      cb(newValue, oldValue);
    }

    if (!state.watchActiveMap.has(watchId)) state.watchActiveMap.set(watchId, true);
    if (!state.listeners.has(watchId)) state.listeners.set(watchId, []);
    state.listeners.get(watchId).push({ handler, config });

    const methods = {
      id(newId) {
        removeListener(handler, watchId);
        watchId = newId;
        config.watchId = newId;
        if (!state.watchActiveMap.has(watchId)) state.watchActiveMap.set(watchId, true);
        if (!state.listeners.has(watchId)) state.listeners.set(watchId, []);
        state.listeners.get(watchId).push({ handler, config });
        return methods;
      },
      throttle(ms) {
        config.throttleTime = ms;
        return methods;
      },
      delay(ms) {
        config.delayTime = ms;
        return methods;
      },
      once(count = 1) {
        config.maxCalls = count;
        return methods;
      },
      useEffect() {
        if (state.watchActiveMap.get(watchId) !== false) {
          executeHandler(handler, config, state.value);
        }
        return methods;
      },
      unwatch() {
        removeListener(handler, watchId);
        return methods;
      }
    };

    return methods;
  }

  return {
    ...method(),
    silent: method(true),
    watch,
    unwatch(watchId) {
      state.watchActiveMap.set(watchId || state.defaultWatchId, false);
      return this;
    },
    runWatch(watchId) {
      state.watchActiveMap.set(watchId || state.defaultWatchId, true);
      return this;
    }
  };
}

function wrapRef(refObj) {
  return new Proxy(refObj, {
    get(target, prop, receiver) {
      if (prop in target) return Reflect.get(target, prop, receiver);
      const val = target.value ?? {};
      return val[prop];
    },
    set(target, prop, value, receiver) {
      if (prop in target) return Reflect.set(target, prop, value, receiver);
      const val = target.value ?? {};
      val[prop] = value;
      return true;
    },
    deleteProperty(target, prop) {
      if (prop in target) return delete target[prop];
      const val = target.value ?? {};
      delete val[prop];
      return true;
    },
    has(target, prop) {
      const val = target.value ?? {};
      return prop in target || prop in val;
    },
    ownKeys(target) {
      const val = target.value ?? {};
      return Array.from(new Set([...Reflect.ownKeys(target), ...Reflect.ownKeys(val)]));
    },
    getOwnPropertyDescriptor(target, prop) {
      if (prop in target) {
        return Object.getOwnPropertyDescriptor(target, prop);
      }
      const val = target.value ?? {};
      const desc = Object.getOwnPropertyDescriptor(val, prop);
      if (desc) return desc;
      // fallback default
      return {
        configurable: true,
        enumerable: true,
        value: undefined,
        writable: true,
      };
    }
  });
}

export function ref(initialValue, maxHistory = 5) {
	return wrapRef(createRef(initialValue, maxHistory))
}

export function watchs(refs, watchId, callback) {
  const watchers = refs.map(ref => ref.watch(callback).id(watchId));
  const chainMethods = {
    throttle(ms) {
      watchers.forEach(w => w.throttle(ms));
      return chainMethods;
    },
    delay(ms) {
      watchers.forEach(w => w.delay(ms));
      return chainMethods;
    },
    once(count = 1) {
      watchers.forEach(w => w.once(count));
      return chainMethods;
    },
    useEffect() {
      watchers.forEach(w => w.useEffect());
      return chainMethods;
    },
    unwatch() {
      watchers.forEach(w => w.unwatch());
      return chainMethods;
    }
  };
  return chainMethods;
}

export class template {
  constructor(el, ...refs) {
    this.el = this.resolveElement(el);
    if (!this.el) throw new Error(`Elemen "${el}" tidak ditemukan!`);
    this.scopeId = `data-${Math.random().toString(36).substr(2, 9)}`;
    this.refs = Array.isArray(refs[0]) ? refs[0] : refs;
    this.reactiveKeys = new Set();
    this.init();
  }

  resolveElement(selector) {
    return /^[\w-]+$/.test(selector)
      ? document.getElementById(selector)
      : document.querySelector(selector);
  }

  css() {
    return "";
  }

  styleUrl() {
    return "";
  }

  template() {
    return "";
  }

  script() {}

  async scriptUrl() {
    return "";
  }

  bindReactive() {
    const templateText = this.template();
    if (!templateText.includes("{{")) return;

    const regex = /{{\s*([\w$.]+)\s*}}/g;
    let match;
    while ((match = regex.exec(templateText))) {
      this.reactiveKeys.add(match[1]);
    }

    this.reactiveKeys.forEach((keyPath) => {
      this.refs.forEach((ref) => {
        ref.watch(keyPath, () => this.render()).once(Infinity);
      });
    });
  }

  render() {
    let tmpl = this.template();

    tmpl = tmpl.replace(/{{\s*([\w$.]+)\s*}}/g, (_, key) => {
      for (let ref of this.refs) {
        try {
          const val = key.split(".").reduce((acc, k) => acc?.[k], ref.value);
          if (val !== undefined) return val;
        } catch {}
      }
      return "";
    });

    this.el.innerHTML = tmpl.replace(/<(\w+)/g, `<$1 ${this.scopeId}`);
  }

  async style() {
    const css = this.css();
    if (css) {
      const scopedCss = css.replace(/([^{}]+){/g, `[${this.scopeId}] $1 {`);
      const styleTag = document.createElement("style");
      styleTag.textContent = scopedCss;
      document.head.appendChild(styleTag);
    }

    const url = this.styleUrl();
    if (url) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = url;
      document.head.appendChild(link);
    }
  }

  async loadScript() {
    const url = await this.scriptUrl();
    if (url) {
      const script = document.createElement("script");
      script.src = url;
      document.body.appendChild(script);
      await new Promise((resolve) => (script.onload = resolve));
    }
  }

  async init() {
    this.render();
    await this.style();
    this.bindReactive();
    this.script();
    await this.loadScript();
  }

  static mount(el, ...refs) {
    return new this(el, ...refs);
  }

  static get template() {
    return new this(document.createElement("div")).template();
  }

  static get style() {
    return new this(document.createElement("div")).css();
  }

  static get script() {
    return new this(document.createElement("div")).script.toString();
  }
}

export function spinner({ size = "md", w = "8" } = {}) {
	return `
		<div>
			<style>
				@import url("https://cdn.jsdelivr.net/combine/npm/daisyui@5/base/scrollbar.css,npm/daisyui@5/base/svg.css,npm/daisyui@5/base/reset.css,npm/daisyui@5/base/rootscrollgutter.css,npm/daisyui@5/base/rootcolor.css,npm/daisyui@5/base/properties.css,npm/daisyui@5/base/rootscrolllock.css,npm/daisyui@5/components/loading.css");
			</style>
			<span class="loading loading-spinner loading-${size} w-${w}"></span>
		</div>
	`
}

export class router {
  constructor(options) {
    try {
      if (!options || !Array.isArray(options.routes)) {
        throw new Error("Router membutuhkan array routes");
      }
      
      this.routes = options.routes;
      this.mode = options.mode || "history";
      this.fallback = options.fallback || (() => "<h1>404 Not Found</h1>");
      this.middleware = options.middleware || [];
      this.beforeEach = options.beforeEach || [];
      this.currentRoute = null;
      this.prefetchLinks = new Set();
      this.scrollPositions = new Map();
      this.history = [];
      this.navigationStats = {
        count: 0,
        lastAccessed: {},
        frequentRoutes: {}
      };
      this.init();
    } catch (err) {
      console.error("Router constructor error:", err);
    }
  }

  init() {
    try {
      window.addEventListener(
        this.mode === "history" ? "popstate" : "hashchange",
        () => this.resolveRoute()
      );
      document.addEventListener("click", (e) => this.handleLinkClick(e));
      this.prefetchHoverLinks();
      this.resolveRoute();
    } catch (err) {
      console.error("Init error:", err);
    }
  }

  resolveRoute() {
    try {
      let path = this.mode === "history" ? window.location.pathname : window.location.hash.slice(1);
      const startTime = performance.now();

      let route = this.findRoute(path);
      if (!route) return this.render(this.fallback());

      if (route.redirect) return this.navigate(route.redirect);
      
      this.navigationStats.count++;
      this.navigationStats.lastAccessed[path] = new Date().toISOString();
      this.navigationStats.frequentRoutes[path] = (this.navigationStats.frequentRoutes[path] || 0) + 1;

      let params = this.extractParams(route.path, path);
      let prevRoute = this.currentRoute;
      let referrer = document.referrer;
      let userAgent = navigator.userAgent;
      let screenSize = {
        width: window.innerWidth,
        height: window.innerHeight
      };
      let connection = navigator.connection ? {
        type: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt,
        saveData: navigator.connection.saveData
      } : null;
      let timingInfo = {
        navigationStart: performance.timing.navigationStart,
        loadEventEnd: performance.timing.loadEventEnd,
        domComplete: performance.timing.domComplete
      };

      let ctx = {
        path,
        params,
        query: this.getQueryParams(),
        hash: window.location.hash,
        host: window.location.host,
        hostname: window.location.hostname,
        href: window.location.href,
        origin: window.location.origin,
        pathname: window.location.pathname,
        port: window.location.port,
        protocol: window.location.protocol,
        search: window.location.search,
        
        meta: route.meta || {},
        route,
        
        method: "GET",
        referrer,
        from: prevRoute ? {
          path: prevRoute.path,
          name: prevRoute.name,
          meta: prevRoute.meta || {},
          params: this.extractParams(prevRoute.path, this.history[this.history.length - 1] || "")
        } : null,
        history: [...this.history],
        
        userAgent,
        language: navigator.language,
        languages: navigator.languages,
        screenSize,
        connection,
        online: navigator.onLine,
        doNotTrack: navigator.doNotTrack,
        cookies: document.cookie,
        
        timestamp: new Date().toISOString(),
        timingInfo,
        startTime,
        
        error: null,
        state: window.history.state,
        
        navigationStats: {...this.navigationStats},
        
        scrollPositions: Object.fromEntries(this.scrollPositions),
        
        platform: {
          isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent),
          isDesktop: !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent),
          isIOS: /iPad|iPhone|iPod/.test(userAgent),
          isAndroid: /Android/.test(userAgent),
          isSafari: /^((?!chrome|android).)*safari/i.test(userAgent),
          isChrome: /chrome/i.test(userAgent) && !/edge/i.test(userAgent),
          isFirefox: /firefox/i.test(userAgent),
          isEdge: /edge/i.test(userAgent)
        },
        
        apiInfo: {
          version: "1.0.0",
          timestamp: Date.now(),
          requestId: this.generateUUID(),
          environment: process.env.NODE_ENV || "development"
        },
        
        redirect: (path) => this.navigate(path),
        reload: () => window.location.reload(),
        back: () => window.history.back(),
        forward: () => window.history.forward()
      };

      this.saveScrollPosition();
      this.history.push(path);
      if (this.history.length > 20) this.history.shift();

      this.runMiddleware(ctx, route.path, () => {
        this.runBeforeEach(ctx, () => {
          ctx.processingTime = performance.now() - startTime;
          this.handleTransition(route, ctx);
        });
      });
    } catch (err) {
      console.error("ResolveRoute error:", err);
    }
  }

  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  findRoute(path) {
    try {
      return this.routes.find(
        r => r.path === path || (r.path.includes(":") && this.matchDynamicRoute(r.path, path))
      );
    } catch (err) {
      console.error("FindRoute error:", err);
      return null;
    }
  }

  withErrorHandling(func, errorPrefix) {
    return async (ctx, next) => {
      try {
        await func(ctx, next);
      } catch (err) {
        console.error(`${errorPrefix} error:`, err);
        ctx.error = err;
        ctx.errorDetails = {
          message: err.message,
          stack: err.stack,
          time: new Date().toISOString(),
          source: errorPrefix
        };
      }
    };
  }

  runMiddleware(ctx, path, next) {
    try {
      let global = this.middleware.find(m => m.path === "global")?.func || [];
      let route = this.middleware.find(m => m.path === path)?.func || [];
      let stack = [...global, ...route];

      ctx.middleware = {
        total: stack.length,
        current: 0,
        completed: [],
        startTime: performance.now()
      };

      let index = 0;
      const run = () => {
        if (index < stack.length) {
          ctx.middleware.current = index + 1;
          const startTime = performance.now();
          const handler = this.withErrorHandling(stack[index++], "Middleware");
          
          handler(ctx, () => {
            ctx.middleware.completed.push({
              index: index - 1,
              duration: performance.now() - startTime
            });
            run();
          });
        } else {
          ctx.middleware.endTime = performance.now();
          ctx.middleware.totalDuration = ctx.middleware.endTime - ctx.middleware.startTime;
          next();
        }
      };
      run();
    } catch (err) {
      console.error("RunMiddleware error:", err);
      ctx.error = err;
      ctx.errorDetails = {
        message: err.message,
        stack: err.stack,
        time: new Date().toISOString(),
        source: "runMiddleware"
      };
    }
  }

  runBeforeEach(ctx, next) {
    try {
      ctx.hooks = {
        total: this.beforeEach.length,
        current: 0,
        completed: [],
        startTime: performance.now()
      };

      let index = 0;
      const run = () => {
        if (index < this.beforeEach.length) {
          ctx.hooks.current = index + 1;
          const startTime = performance.now();
          
          Promise.resolve(this.beforeEach[index++](ctx, () => {
            ctx.hooks.completed.push({
              index: index - 1,
              duration: performance.now() - startTime
            });
            run();
          })).catch((err) => {
            console.error("beforeEach error:", err);
            ctx.error = err;
            ctx.errorDetails = {
              message: err.message,
              stack: err.stack,
              time: new Date().toISOString(),
              source: "beforeEach",
              hook: index - 1
            };
          });
        } else {
          ctx.hooks.endTime = performance.now();
          ctx.hooks.totalDuration = ctx.hooks.endTime - ctx.hooks.startTime;
          next();
        }
      };
      run();
    } catch (err) {
      console.error("RunBeforeEach error:", err);
      ctx.error = err;
      ctx.errorDetails = {
        message: err.message,
        stack: err.stack,
        time: new Date().toISOString(),
        source: "runBeforeEach"
      };
    }
  }
  
  handleTransition(route, ctx) {
    try {
      ctx.transition = {
        from: this.currentRoute?.path,
        to: route.path,
        startTime: performance.now()
      };

      if (this.currentRoute?.onLeave) {
        this.applyTransition(this.currentRoute.onLeave);
        ctx.transition.leaveAnimation = this.currentRoute.onLeave;
      }

      this.currentRoute = route;

      if (route.onEnter) {
        this.applyTransition(route.onEnter);
        ctx.transition.enterAnimation = route.onEnter;
      }

      this.loadComponent(route, ctx);
    } catch (err) {
      console.error("Transition error:", err);
      ctx.error = err;
      ctx.errorDetails = {
        message: err.message,
        stack: err.stack,
        time: new Date().toISOString(),
        source: "handleTransition"
      };
    }
  }

  applyTransition(value) {
    try {
      const app = document.getElementById("app");
      if (!app) {
        console.error("Element app tidak ditemukan");
        return;
      }
      app.setAttribute("data-transition", value);
    } catch (err) {
      console.error("ApplyTransition error:", err);
    }
  }

  async loadComponent(route, ctx) {
    const app = document.getElementById("app");
    if (!app) {
      console.error("Element app tidak ditemukan");
      return;
    }
    
    app.innerHTML = spinner();

    try {
      ctx.component = {
        startLoadTime: performance.now(),
        name: route.name || "unknown"
      };
      
      let html = await route.component(ctx);
      
      ctx.component.loadDuration = performance.now() - ctx.component.startLoadTime;
      ctx.transition.endTime = performance.now();
      ctx.transition.duration = ctx.transition.endTime - ctx.transition.startTime;
      
      this.restoreScroll(route.path);
      this.render(html);
      
      const navEvent = new CustomEvent('router:navigation-complete', { 
        detail: { 
          ctx,
          performance: {
            total: performance.now() - ctx.startTime,
            middleware: ctx.middleware?.totalDuration || 0,
            hooks: ctx.hooks?.totalDuration || 0,
            component: ctx.component?.loadDuration || 0,
            transition: ctx.transition?.duration || 0
          }
        } 
      });
      document.dispatchEvent(navEvent);
      
    } catch (err) {
      console.error("Component load error:", err);
      ctx.error = err;
      ctx.errorDetails = {
        message: err.message,
        stack: err.stack,
        time: new Date().toISOString(),
        source: "loadComponent"
      };
      
      const errorEvent = new CustomEvent('router:error', { 
        detail: { ctx, error: err } 
      });
      document.dispatchEvent(errorEvent);
      
      this.render(`<h1>Error loading component</h1><pre>${err.message}</pre>`);
    }
  }

  render(html) {
    try {
      const app = document.getElementById("app");
      if (!app) {
        console.error("Element app tidak ditemukan");
        return;
      }
      
      app.classList.add("fade-out");
      setTimeout(() => {
        app.innerHTML = html;
        app.classList.remove("fade-out");
        
        const renderEvent = new CustomEvent('router:render-complete', { 
          detail: { route: this.currentRoute } 
        });
        document.dispatchEvent(renderEvent);
      }, 300);
    } catch (err) {
      console.error("Render error:", err);
    }
  }

  navigate(path, state = {}, options = {}) {
    try {
      const navStartTime = performance.now();
      
      const navEvent = {
        from: this.currentRoute?.path,
        to: path,
        timestamp: new Date().toISOString(),
        options
      };
      
      const startEvent = new CustomEvent('router:navigation-start', { 
        detail: navEvent 
      });
      document.dispatchEvent(startEvent);
      
      if (this.mode === "history") {
        window.history.pushState(state, "", path);
      } else {
        window.location.hash = path;
      }
      
      navEvent.duration = performance.now() - navStartTime;
      
      this.resolveRoute();
    } catch (err) {
      console.error("Navigate error:", err);
      // Emit navigation error event
      const errorEvent = new CustomEvent('router:navigation-error', { 
        detail: { path, error: err } 
      });
      document.dispatchEvent(errorEvent);
    }
  }

  handleLinkClick(e) {
    try {
      if (e.target.tagName === "A" && e.target.hasAttribute("data-route")) {
        e.preventDefault();
        
        const linkData = {
          href: e.target.getAttribute("href"),
          text: e.target.innerText,
          id: e.target.id,
          classes: e.target.className,
          timestamp: new Date().toISOString(),
          clientX: e.clientX,
          clientY: e.clientY
        };
        
        const clickEvent = new CustomEvent('router:link-click', { 
          detail: linkData 
        });
        document.dispatchEvent(clickEvent);
        
        this.navigate(linkData.href);
      }
    } catch (err) {
      console.error("HandleLinkClick error:", err);
    }
  }

  prefetchHoverLinks() {
    try {
      document.addEventListener("mouseover", (e) => {
        try {
          if (e.target.tagName === "A" && e.target.hasAttribute("data-route")) {
            let href = e.target.getAttribute("href");
            if (href && !this.prefetchLinks.has(href)) {
              this.prefetchLinks.add(href);
              
              const prefetchEvent = new CustomEvent('router:prefetch-start', { 
                detail: { href } 
              });
              document.dispatchEvent(prefetchEvent);
              
              fetch(href)
                .then(response => {
                  const successEvent = new CustomEvent('router:prefetch-success', { 
                    detail: { href, status: response.status } 
                  });
                  document.dispatchEvent(successEvent);
                })
                .catch(err => {
                  console.warn(`Failed to prefetch ${href}:`, err);
                  const errorEvent = new CustomEvent('router:prefetch-error', { 
                    detail: { href, error: err } 
                  });
                  document.dispatchEvent(errorEvent);
                });
            }
          }
        } catch (err) {
          console.error("Prefetch hover error:", err);
        }
      });
    } catch (err) {
      console.error("PrefetchHoverLinks error:", err);
    }
  }

  getQueryParams() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const params = {};
      
      for (const [key, value] of urlParams.entries()) {
        if (value === 'true') {
          params[key] = true;
        } else if (value === 'false') {
          params[key] = false;
        } else if (!isNaN(Number(value)) && value !== '') {
          params[key] = Number(value);
        } else if (value.startsWith('[') && value.endsWith(']')) {
          try {
            params[key] = JSON.parse(value);
          } catch {
            params[key] = value;
          }
        } else if (value.startsWith('{') && value.endsWith('}')) {
          try {
            params[key] = JSON.parse(value);
          } catch {
            params[key] = value;
          }
        } else {
          params[key] = value;
        }
      }
      
      return params;
    } catch (err) {
      console.error("GetQueryParams error:", err);
      return {};
    }
  }
  
	matchDynamicRoute(routePath, currentPath) {
    try {
      let paramNames = [];
      let regexPath = routePath.replace(/:\w+/g, (match) => {
        paramNames.push(match.substring(1));
        return "([\\w-]+)";
      });
      
      let routeRegex = new RegExp("^" + regexPath + "$", "i");
      return routeRegex.test(currentPath);
    } catch (err) {
      console.error("MatchDynamicRoute error:", err);
      return false;
    }
  }

  extractParams(routePath, currentPath) {
    try {
      let keys = routePath.match(/:\w+/g) || [];
      let paramRegex = new RegExp(
        routePath.replace(/:\w+/g, "([\\w-]+)"),
        "i"
      );
      let values = currentPath.match(paramRegex) || [];
      
      let params = {};
      
      keys.forEach((key, i) => {
        const paramName = key.replace(":", "");
        const value = values[i + 1];
        
        if (value === 'true') {
          params[paramName] = true;
        } else if (value === 'false') {
          params[paramName] = false;
        } else if (!isNaN(Number(value)) && value !== '') {
          params[paramName] = Number(value);
        } else {
          params[paramName] = value || null;
        }
      });
      
      return params;
    } catch (err) {
      console.error("ExtractParams error:", err);
      return {};
    }
  }

  saveScrollPosition() {
    try {
      const app = document.getElementById("app");
      if (app && this.currentRoute?.path) {
        const position = {
          x: window.scrollX || window.pageXOffset,
          y: window.scrollY || window.pageYOffset,
          appScroll: app.scrollTop,
          timestamp: new Date().toISOString()
        };
        
        this.scrollPositions.set(this.currentRoute.path, position);
      }
    } catch (err) {
      console.error("SaveScrollPosition error:", err);
    }
  }

  restoreScroll(path) {
    try {
      const app = document.getElementById("app");
      if (!app) return;
      
      let pos = this.scrollPositions.get(path);
      if (pos) {
        if (typeof pos === "number") {
          app.scrollTop = pos;
        } else {
          window.scrollTo(pos.x, pos.y);
          app.scrollTop = pos.appScroll;
          
          const scrollEvent = new CustomEvent('router:scroll-restored', { 
            detail: { path, position: pos } 
          });
          document.dispatchEvent(scrollEvent);
        }
      }
    } catch (err) {
      console.error("RestoreScroll error:", err);
    }
  }
  
  getNavigationStats() {
    try {
      return {
        total: this.navigationStats.count,
        history: this.history,
        mostVisited: Object.entries(this.navigationStats.frequentRoutes)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([path, count]) => ({ path, count })),
        lastAccessed: this.navigationStats.lastAccessed
      };
    } catch (err) {
      console.error("GetNavigationStats error:", err);
      return {};
    }
  }
  
  resetStats() {
    try {
      this.navigationStats = {
        count: 0,
        lastAccessed: {},
        frequentRoutes: {}
      };
      
      const resetEvent = new CustomEvent('router:stats-reset');
      document.dispatchEvent(resetEvent);
      
      return true;
    } catch (err) {
      console.error("ResetStats error:", err);
      return false;
    }
  }
}

export function createRouter(options) {
  try {
    return new router(options);
  } catch (err) {
    console.error("CreateRouter error:", err);
    return null;
  }
};