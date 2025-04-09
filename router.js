import {spinner} from " ./spinner.js"

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
  