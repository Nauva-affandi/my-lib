import { cloneDeep } from './cloneDeep.js'

function base(source, callback) {
  const sources = Array.isArray(source) ? source : [source]

  const config = {
    throttleTime: 0,
    delayTime: 0,
    lastCalled: 0,
    timeout: null,
    callCount: 0,
    maxCalls: Infinity,
    lastValues: sources.map(s => cloneDeep(s.value)),
  }

  function trigger() {
    const now = Date.now()
    const throttlePassed = now - config.lastCalled >= config.throttleTime

    if (config.throttleTime > 0 && !throttlePassed) return

    config.lastCalled = now

    const newValues = sources.map(s => s.value)
    const oldValues = config.lastValues

    const run = () => {
      if (config.callCount >= config.maxCalls) return

      try {
        callback(
          newValues.length === 1 ? newValues[0] : newValues,
          oldValues.length === 1 ? oldValues[0] : oldValues
        )
        config.callCount++
      } catch (error) {
        console.error(error)
      }

      config.lastValues = newValues.map(cloneDeep)
    }

    if (config.delayTime > 0) {
      clearTimeout(config.timeout)
      config.timeout = setTimeout(run, config.delayTime)
    } else {
      run()
    }
  }

  function applyProxy(ref) {
    const raw = ref.value

    // Untuk objek dalam properti, kasih proxy juga
    for (const key in raw) {
      if (typeof raw[key] === 'object') {
        raw[key] = new Proxy(raw[key], {
          set(target, prop, value) {
            target[prop] = value
            trigger()
            return true
          }
        })
      }
    }

    ref.value = new Proxy(raw, {
      set(target, prop, value) {
        target[prop] = value
        trigger()
        return true
      }
    })
  }

  // Pasang proxy ke semua source
  for (const s of sources) {
    applyProxy(s)
  }

  const methods = {
    throttle(ms) {
      config.throttleTime = ms
      return methods
    },
    delay(ms) {
      config.delayTime = ms
      return methods
    },
    once(times = 1) {
      config.maxCalls = times
      return methods
    },
    useEffect() {
      trigger()
      return methods
    },
  }

  return methods
}

 export const watch = base()
