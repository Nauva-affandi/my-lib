import createElement from "./createElement.js"

function createApp(vnode) {
  const el = createElement(null, vnode);

  return {
    el,
    mount(parent) {
      parent.appendChild(el);
    },
    replace(target) {
      target.replaceWith(el);
    },
    remove() {
      el.remove();
    },
  };
}