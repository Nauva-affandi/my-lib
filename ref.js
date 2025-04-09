import { cloneDeep } from './cloneDeep.js'

function base(initialValue, maxHistory = 5) {
  const state = {
    value: cloneDeep(initialValue),
    listeners: new Map(),
    history: [],
    initialClone: cloneDeep(initialValue),
    watchActiveMap: new Map(),
    defaultWatchId: 'main',
    batching: false,
    batchQueued: false,
  }

  const proxyHandler = {
    set: (target, prop, newValue) => {
      if (target[prop] !== newValue) {
        target[prop] = newValue
        if (!state.batching) notify()
        else state.batchQueued = true
      }
      return true
    },
  }

  function notify() {
    if (state.batchQueued) {
      state.batchQueued = false
    } else {
      return
    }

    state.listeners.forEach((listeners, watchId) => {
      if (state.watchActiveMap.get(watchId) === false) return
      listeners.forEach(({ handler, config }) => {
        executeHandler(handler, config, state.value)
      })
    })
  }

  function executeHandler(handler, config, newValue) {
    const now = Date.now()
    if (config.throttleTime > 0 && now - config.lastCalled < config.throttleTime) return
    config.lastCalled = now

    let valueToPass = config.trackPath ? getNestedValue(newValue, config.trackPath) : newValue
    let oldValueToPass = config.trackPath ? getNestedValue(config.lastValue, config.trackPath) : config.lastValue

    const runHandler = () => {
      if (config.callCount >= config.maxCalls) {
        removeListener(handler)
        return
      }
      try {
        handler(valueToPass, oldValueToPass)
        config.callCount++
        if (config.callCount >= config.maxCalls) removeListener(handler)
      } catch (error) {
        console.error(error.message)
      }
      config.lastValue = cloneDeep(newValue)
    }

    if (config.delayTime > 0) {
      clearTimeout(config.timeout)
      config.timeout = setTimeout(runHandler, config.delayTime)
    } else {
      runHandler()
    }
  }

  function getNestedValue(obj, path) {
    if (typeof path !== 'string') throw new Error('Path harus string.')
    const keys = path.split('.').map((key) => key.trim())
    let current = obj
    for (const key of keys) {
      if (current === undefined || current === null) {
        throw new Error(`Path '${path}' invalid.`)
      }
      if (Array.isArray(current) && !/^\d+$/.test(key)) throw new Error(`'${key}' bukan indeks array.`)
      if (Array.isArray(current)) current = current[Number(key)]
      else if (Object.prototype.hasOwnProperty.call(current, key)) current = current[key]
      else throw new Error(`Properti '${key}' tidak ditemukan.`)
    }
    return current
  }

  function removeListener(handler, watchId) {
    if (!state.listeners.has(watchId)) return
    const listeners = state.listeners.get(watchId).filter((l) => l.handler !== handler)
    if (listeners.length === 0) {
      state.listeners.delete(watchId)
      state.watchActiveMap.delete(watchId)
    } else {
      state.listeners.set(watchId, listeners)
    }
  }

  function saveHistory() {
    if (state.history.length >= maxHistory) {
      state.history.shift()
    }
    state.history.push(cloneDeep(state.value))
  }

  function getReactiveValue(val) {
    if (typeof val === 'object' && val !== null) {
      return new proxy(val, proxyHandler)
    } else {
      return val
    }
  }

  function convertValue(newValue) {
    return getReactiveValue(cloneDeep(newValue))
  }

  function update(action, silent = false) {
    saveHistory()
    action()
    if (!silent && !state.batching) notify()
    else state.batchQueued = true
  }

  function method(silent = false) {
    return {
      get value() {
        return state.value
      },
      set value(newValue) {
        update(() => (state.value = convertValue(newValue)), silent)
      },
      set(newValue) {
        update(() => (state.value = convertValue(newValue)), silent)
      },
      undo() {
        update(() => {
          if (state.history.length > 0) state.value = getReactiveValue(state.history.pop())
        }, silent)
      },
      reset() {
        update(() => (state.value = getReactiveValue(clone(state.initialClone))), silent)
      },
      unwatch(watchId) {
        state.watchActiveMap.set(watchId || state.defaultWatchId, false)
        return this
      },
      jalankanWatch(watchId) {
        state.watchActiveMap.set(watchId || state.defaultWatchId, true)
        return this
      },
      batch(fn) {
        state.batching = true
        fn()
        state.batching = false
        if (state.batchQueued) notify()
      },
    }
  }

  function watch(target, callback = null) {
    let cb = callback || target
    let trackPath = callback ? target : null
    let watchId = state.defaultWatchId

    const config = {
      trackPath,
      throttleTime: 0,
      delayTime: 0,
      lastCalled: 0,
      timeout: null,
      callCount: 0,
      maxCalls: 1,
      lastValue: cloneDeep(state.value),
      watchId,
    }

    function handler(newValue, oldValue) {
      cb(newValue, oldValue)
    }

    if (!state.watchActiveMap.has(watchId)) state.watchActiveMap.set(watchId, true)
    if (!state.listeners.has(watchId)) state.listeners.set(watchId, [])
    state.listeners.get(watchId).push({ handler, config })

    const methods = {
      id(newId) {
        removeListener(handler, watchId)
        watchId = newId
        config.watchId = newId
        if (!state.watchActiveMap.has(watchId)) state.watchActiveMap.set(watchId, true)
        if (!state.listeners.has(watchId)) state.listeners.set(watchId, [])
        state.listeners.get(watchId).push({ handler, config })
        return methods
      },
      throttle(ms) {
        config.throttleTime = ms
        return methods
      },
      delay(ms) {
        config.delayTime = ms
        return methods
      },
      once(count = 1) {
        config.maxCalls = count
        return methods
      },
      useEffect() {
        if (state.watchActiveMap.get(watchId) !== false) {
          executeHandler(handler, config, state.value)
        }
        return methods
      },
      unwatch() {
        removeListener(handler, watchId)
        return methods
      },
    }

    return methods
  }

  return {
    ...method(),
    silent: method(true),
    watch,
    unwatch(watchId) {
      state.watchActiveMap.set(watchId || state.defaultWatchId, false)
      return this
    },
    runWatch(watchId) {
      state.watchActiveMap.set(watchId || state.defaultWatchId, true)
      return this
    },
  }
}

function wrapRef(refObj) {
  return new Proxy(refObj, {
    get(target, prop, receiver) {
      if (prop in target) return Reflect.get(target, prop, receiver)
      const val = target.value ?? {}
      return val[prop]
    },
    set(target, prop, value, receiver) {
      if (prop in target) return Reflect.set(target, prop, value, receiver)
      const val = target.value ?? {}
      val[prop] = value
      return true
    },
    deleteProperty(target, prop) {
      if (prop in target) return delete target[prop]
      const val = target.value ?? {}
      delete val[prop]
      return true
    },
    has(target, prop) {
      const val = target.value ?? {}
      return prop in target || prop in val
    },
    ownKeys(target) {
      const val = target.value ?? {}
      return Array.from(new Set([...Reflect.ownKeys(target), ...Reflect.ownKeys(val)]))
    },
    getOwnPropertyDescriptor(target, prop) {
      if (prop in target) {
        return Object.getOwnPropertyDescriptor(target, prop)
      }
      const val = target.value ?? {}
      const desc = Object.getOwnPropertyDescriptor(val, prop)
      if (desc) return desc
      // fallback default
      return {
        configurable: true,
        enumerable: true,
        value: undefined,
        writable: true,
      }
    },
  })
}

function ref(initialValue, maxHistory = 5) {
  return wrapRef(base(initialValue, maxHistory))
}

let createRef = base
export { ref, createRef }
