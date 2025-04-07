export default class template {
  constructor(el) {
    this.el = this.resolveElement(el);
    if (!this.el) throw new Error(`Elemen "${el}" tidak ditemukan!`);
    this.scopeId = `data-${Math.random().toString(36).substr(2, 9)}`;
    this.init();
  }

  resolveElement(selector) {
    return /^[\w-]+$/.test(selector)
      ? document.getElementById(selector)
      : document.querySelector(selector);
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

  css() {
    return ""; // Bisa di-override
  }

  styleUrl() {
    return ""; // Bisa di-override
  }

  template() {
    return ""; // Bisa di-override
  }

  script() {} // Bisa di-override

  async scriptUrl() {
    return ""; // Bisa di-override
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

  render() {
    const tmpl = this.template();
    if (tmpl) this.el.innerHTML = tmpl.replace(/<(\w+)/g, `<$1 ${this.scopeId}`);
  }

  async init() {
    this.render();
    await this.style();
    this.script();
    await this.loadScript();
  }

  static mount(el) {
    return new this(el);
  }

  // **Fitur Baru: Dapatkan Template dan CSS Tanpa Instansiasi**
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