export default function createElement(f, options) {
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