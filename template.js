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