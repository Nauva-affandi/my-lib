export default function watchs(refs, watchId, callback) {
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