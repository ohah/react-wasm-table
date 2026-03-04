/**
 * Minimal DOM polyfill for Bun test environment.
 * Avoids happy-dom's GlobalRegistrator which causes Bun segfaults.
 */

// ── Event classes ────────────────────────────────────────────────────────

class MockEvent {
  type: string;
  bubbles: boolean;
  cancelable: boolean;
  defaultPrevented = false;
  target: any = null;
  currentTarget: any = null;
  eventPhase = 0;
  timeStamp = Date.now();
  isTrusted = false;
  cancelBubble = false;
  constructor(
    type: string,
    init?: { bubbles?: boolean; cancelable?: boolean; [key: string]: any },
  ) {
    this.type = type;
    this.bubbles = init?.bubbles ?? false;
    this.cancelable = init?.cancelable ?? false;
  }
  preventDefault() {
    this.defaultPrevented = true;
  }
  stopPropagation() {
    this.cancelBubble = true;
  }
  stopImmediatePropagation() {
    this.cancelBubble = true;
  }
  composedPath() {
    return [];
  }
}

class MockMouseEvent extends MockEvent {
  clientX: number;
  clientY: number;
  pageX: number;
  pageY: number;
  screenX: number;
  screenY: number;
  offsetX: number;
  offsetY: number;
  button: number;
  buttons: number;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  detail: number;
  constructor(type: string, init?: Record<string, any>) {
    super(type, init);
    this.clientX = init?.clientX ?? 0;
    this.clientY = init?.clientY ?? 0;
    this.pageX = init?.pageX ?? 0;
    this.pageY = init?.pageY ?? 0;
    this.screenX = init?.screenX ?? 0;
    this.screenY = init?.screenY ?? 0;
    this.offsetX = init?.offsetX ?? 0;
    this.offsetY = init?.offsetY ?? 0;
    this.button = init?.button ?? 0;
    this.buttons = init?.buttons ?? 0;
    this.ctrlKey = init?.ctrlKey ?? false;
    this.shiftKey = init?.shiftKey ?? false;
    this.altKey = init?.altKey ?? false;
    this.metaKey = init?.metaKey ?? false;
    this.detail = init?.detail ?? 0;
  }
}

class MockKeyboardEvent extends MockEvent {
  key: string;
  code: string;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  repeat: boolean;
  constructor(type: string, init?: Record<string, any>) {
    super(type, init);
    this.key = init?.key ?? "";
    this.code = init?.code ?? "";
    this.ctrlKey = init?.ctrlKey ?? false;
    this.shiftKey = init?.shiftKey ?? false;
    this.altKey = init?.altKey ?? false;
    this.metaKey = init?.metaKey ?? false;
    this.repeat = init?.repeat ?? false;
  }
}

class MockWheelEvent extends MockMouseEvent {
  deltaX: number;
  deltaY: number;
  deltaZ: number;
  deltaMode: number;
  constructor(type: string, init?: Record<string, any>) {
    super(type, init);
    this.deltaX = init?.deltaX ?? 0;
    this.deltaY = init?.deltaY ?? 0;
    this.deltaZ = init?.deltaZ ?? 0;
    this.deltaMode = init?.deltaMode ?? 0;
  }
}

class MockTouchEvent extends MockEvent {
  touches: { clientX: number; clientY: number }[];
  changedTouches: { clientX: number; clientY: number }[];
  targetTouches: { clientX: number; clientY: number }[];
  constructor(type: string, init?: Record<string, any>) {
    super(type, init);
    this.touches = init?.touches ?? [];
    this.changedTouches = init?.changedTouches ?? [];
    this.targetTouches = init?.targetTouches ?? [];
  }
}

class MockFocusEvent extends MockEvent {
  relatedTarget: any;
  constructor(type: string, init?: Record<string, any>) {
    super(type, init);
    this.relatedTarget = init?.relatedTarget ?? null;
  }
}

class MockInputEvent extends MockEvent {
  data: string | null;
  inputType: string;
  constructor(type: string, init?: Record<string, any>) {
    super(type, init);
    this.data = init?.data ?? null;
    this.inputType = init?.inputType ?? "";
  }
}

// Forward declaration — assigned after mockDocument is created
let _mockDocument: any = null;

// ── DOM Node / Element stubs ─────────────────────────────────────────────

class MockNode {
  childNodes: MockNode[] = [];
  parentNode: MockNode | null = null;
  parentElement: MockNode | null = null;
  nodeType = 1;
  nodeName = "";
  textContent = "";

  get ownerDocument(): any {
    return _mockDocument;
  }

  get firstChild(): MockNode | null {
    return this.childNodes[0] ?? null;
  }
  get lastChild(): MockNode | null {
    return this.childNodes[this.childNodes.length - 1] ?? null;
  }
  get nextSibling(): MockNode | null {
    if (!this.parentNode) return null;
    const idx = this.parentNode.childNodes.indexOf(this);
    return this.parentNode.childNodes[idx + 1] ?? null;
  }
  get previousSibling(): MockNode | null {
    if (!this.parentNode) return null;
    const idx = this.parentNode.childNodes.indexOf(this);
    return idx > 0 ? this.parentNode.childNodes[idx - 1]! : null;
  }
  get hasChildNodes(): () => boolean {
    return () => this.childNodes.length > 0;
  }

  appendChild(child: MockNode) {
    if (child.parentNode) child.parentNode.removeChild(child);
    this.childNodes.push(child);
    child.parentNode = this;
    child.parentElement = this;
    return child;
  }
  insertBefore(newChild: MockNode, refChild: MockNode | null) {
    if (newChild.parentNode) newChild.parentNode.removeChild(newChild);
    if (!refChild) {
      this.childNodes.push(newChild);
    } else {
      const idx = this.childNodes.indexOf(refChild);
      if (idx >= 0) this.childNodes.splice(idx, 0, newChild);
      else this.childNodes.push(newChild);
    }
    newChild.parentNode = this;
    newChild.parentElement = this;
    return newChild;
  }
  replaceChild(newChild: MockNode, oldChild: MockNode) {
    const idx = this.childNodes.indexOf(oldChild);
    if (idx >= 0) {
      if (newChild.parentNode) newChild.parentNode.removeChild(newChild);
      this.childNodes[idx] = newChild;
      newChild.parentNode = this;
      newChild.parentElement = this;
      oldChild.parentNode = null;
      oldChild.parentElement = null;
    }
    return oldChild;
  }
  removeChild(child: MockNode) {
    const idx = this.childNodes.indexOf(child);
    if (idx >= 0) this.childNodes.splice(idx, 1);
    child.parentNode = null;
    child.parentElement = null;
    return child;
  }
  contains(other: MockNode | null): boolean {
    if (!other) return false;
    if (other === this) return true;
    return this.childNodes.some((c) => (c as any).contains(other));
  }
  cloneNode(_deep?: boolean): MockNode {
    const node = new MockNode();
    node.textContent = this.textContent;
    return node;
  }
  getRootNode() {
    return _mockDocument;
  }
  remove(): void {
    if (this.parentNode) {
      this.parentNode.removeChild(this);
    }
  }
}

class MockElement extends MockNode {
  tagName: string;
  localName: string;
  namespaceURI: string | null = "http://www.w3.org/1999/xhtml";
  style: Record<string, string> & {
    getPropertyValue?: (name: string) => string;
    setProperty?: (name: string, value: string) => void;
    removeProperty?: (name: string) => void;
    cssText?: string;
  };
  attributes: Map<string, string> = new Map();
  innerHTML = "";
  outerHTML = "";
  id = "";
  className = "";
  scrollTop = 0;
  scrollLeft = 0;
  scrollWidth = 0;
  scrollHeight = 0;
  clientWidth = 0;
  clientHeight = 0;
  offsetWidth = 0;
  offsetHeight = 0;
  offsetTop = 0;
  offsetLeft = 0;
  private _listeners: Map<string, Set<Function>> = new Map();
  private _classes = new Set<string>();

  constructor(tagName = "DIV") {
    super();
    this.tagName = tagName.toUpperCase();
    this.localName = tagName.toLowerCase();
    this.nodeName = this.tagName;
    this.style = new Proxy({} as any, {
      get(_target, prop) {
        if (prop === "getPropertyValue") return (name: string) => _target[name] ?? "";
        if (prop === "setProperty")
          return (name: string, value: string) => {
            _target[name] = value;
          };
        if (prop === "removeProperty")
          return (name: string) => {
            delete _target[name];
          };
        if (prop === "cssText") return "";
        return _target[prop] ?? "";
      },
      set(_target, prop, value) {
        _target[prop] = value;
        return true;
      },
    });
  }

  get children(): MockElement[] {
    return this.childNodes.filter((c): c is MockElement => c instanceof MockElement);
  }
  get firstElementChild(): MockElement | null {
    return this.children[0] ?? null;
  }
  get lastElementChild(): MockElement | null {
    const ch = this.children;
    return ch[ch.length - 1] ?? null;
  }
  get nextElementSibling(): MockElement | null {
    if (!this.parentNode) return null;
    const siblings = this.parentNode.childNodes;
    const idx = siblings.indexOf(this);
    for (let i = idx + 1; i < siblings.length; i++) {
      if (siblings[i] instanceof MockElement) return siblings[i] as MockElement;
    }
    return null;
  }

  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
    if (name === "id") this.id = value;
    if (name === "class") this.className = value;
  }
  getAttribute(name: string) {
    return this.attributes.get(name) ?? null;
  }
  removeAttribute(name: string) {
    this.attributes.delete(name);
  }
  hasAttribute(name: string) {
    return this.attributes.has(name);
  }
  addEventListener(type: string, fn: Function, options?: any) {
    if (!this._listeners.has(type)) this._listeners.set(type, new Set());
    this._listeners.get(type)?.add(fn);
    // Support AbortSignal-based removal
    const signal = options?.signal as AbortSignal | undefined;
    if (signal) {
      signal.addEventListener("abort", () => {
        this._listeners.get(type)?.delete(fn);
      });
    }
  }
  removeEventListener(type: string, fn: Function, _options?: any) {
    this._listeners.get(type)?.delete(fn);
  }
  dispatchEvent(event: any) {
    try {
      if (!event.target) event.target = this;
    } catch {}
    try {
      event.currentTarget = this;
    } catch {}
    const fns = this._listeners.get(event.type);
    if (fns) for (const fn of fns) fn(event);
    // Bubble the event up the DOM tree (React uses event delegation)
    if (
      event.bubbles &&
      !event.cancelBubble &&
      this.parentNode &&
      this.parentNode instanceof MockElement
    ) {
      (this.parentNode as MockElement).dispatchEvent(event);
    }
    return !event.defaultPrevented;
  }
  getBoundingClientRect() {
    return { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON() {} };
  }
  getClientRects() {
    return [];
  }
  /** Basic selector matching: supports tag name, #id, .class, [attr], [attr="val"], and combinations. */
  private _matchesSelector(selector: string): boolean {
    let sel = selector.trim();
    if (!sel) return false;

    // Simple tag name (e.g. "input", "div")
    if (/^[a-zA-Z][a-zA-Z0-9]*$/.test(sel)) {
      return this.localName === sel.toLowerCase();
    }

    // #id selector
    if (sel.startsWith("#")) {
      return this.id === sel.slice(1);
    }

    // .class selector
    if (sel.startsWith(".")) {
      return this._classes.has(sel.slice(1));
    }

    // [attr] or [attr="val"] selector
    const attrMatch = sel.match(/^\[([a-zA-Z\-]+)(?:="([^"]*)")?\]$/);
    if (attrMatch) {
      const attrName = attrMatch[1] ?? "";
      if (attrMatch[2] !== undefined) {
        return this.getAttribute(attrName) === attrMatch[2];
      }
      return this.hasAttribute(attrName);
    }

    // Composite: tag + other selectors (e.g. "input[type='text']", "div.class")
    // Try to split tag from rest
    const tagMatch = sel.match(/^([a-zA-Z][a-zA-Z0-9]*)([\[\.\#].*)$/);
    if (tagMatch) {
      if (this.localName !== tagMatch[1]?.toLowerCase()) return false;
      return this._matchesSelector(tagMatch[2] ?? "");
    }

    return false;
  }

  /** Collect all descendant elements matching a selector. */
  private _querySelectorCollect(selector: string, results: MockElement[]): void {
    for (const child of this.childNodes) {
      if (child instanceof MockElement) {
        if (child._matchesSelector(selector)) {
          results.push(child);
        }
        child._querySelectorCollect(selector, results);
      }
    }
  }

  querySelector(selector: string): MockElement | null {
    const results: MockElement[] = [];
    this._querySelectorCollect(selector, results);
    return results[0] ?? null;
  }
  querySelectorAll(selector: string): MockElement[] {
    const results: MockElement[] = [];
    this._querySelectorCollect(selector, results);
    return results;
  }
  getElementsByTagName(tag: string): MockElement[] {
    return this.querySelectorAll(tag);
  }
  getElementsByClassName(cls: string): MockElement[] {
    return this.querySelectorAll(`.${cls}`);
  }
  matches(selector: string): boolean {
    return this._matchesSelector(selector);
  }
  closest(selector: string): MockElement | null {
    for (
      let el: MockElement | null = this as MockElement;
      el;
      el = el.parentElement instanceof MockElement ? (el.parentElement as MockElement) : null
    ) {
      if (el._matchesSelector(selector)) return el;
    }
    return null;
  }
  focus() {}
  blur() {}
  click() {}
  cloneNode(deep?: boolean): MockElement {
    const el = new MockElement(this.tagName);
    if (deep) {
      for (const child of this.childNodes) {
        el.appendChild(child.cloneNode(deep));
      }
    }
    return el;
  }
  get classList() {
    const classes = this._classes;
    return {
      add: (...names: string[]) => names.forEach((n) => classes.add(n)),
      remove: (...names: string[]) => names.forEach((n) => classes.delete(n)),
      contains: (name: string) => classes.has(name),
      toggle: (name: string) => {
        if (classes.has(name)) classes.delete(name);
        else classes.add(name);
      },
      toString: () => Array.from(classes).join(" "),
      [Symbol.iterator]: () => classes.values(),
    };
  }

  // React internals may access these
  get dataset() {
    return new Proxy({} as Record<string, string>, {
      get: (_t, prop: string) =>
        this.getAttribute(`data-${prop.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`) ??
        undefined,
      set: (_t, prop: string, value: string) => {
        this.setAttribute(`data-${prop.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`, value);
        return true;
      },
    });
  }
}

class MockHTMLInputElement extends MockElement {
  private _value = "";
  type = "text";
  checked = false;
  disabled = false;
  readOnly = false;
  placeholder = "";
  name = "";
  selected = false;
  defaultSelected = false;
  defaultValue = "";
  selectionStart: number | null = null;
  selectionEnd: number | null = null;
  tabIndex = 0;
  constructor(tagName = "INPUT") {
    super(tagName);
  }

  /** Value getter/setter — needed by @testing-library/dom's setNativeValue. */
  get value(): string {
    // For <select>, return the value of the selected option
    if (this.localName === "select") {
      const opts = this.options;
      const selected = opts.find((o) => o.selected);
      if (selected) return selected.value;
      return opts[0]?.value ?? "";
    }
    // For <option>, check the "value" attribute (set by React via setAttribute)
    if (this.localName === "option") {
      const attrVal = this.getAttribute("value");
      if (attrVal !== null) return attrVal;
    }
    return this._value;
  }
  set value(v: string) {
    this._value = v;
    // For <select>, also update which option is selected
    if (this.localName === "select") {
      const opts = this.options;
      for (const opt of opts) {
        opt.selected = opt.value === v;
      }
    }
  }

  setSelectionRange(start: number | null, end: number | null) {
    this.selectionStart = start;
    this.selectionEnd = end;
  }
  select() {}

  /**
   * For <select> elements, returns child <option> elements.
   * React's updateOptions() accesses node.options and iterates via node.options.length.
   */
  get options(): MockHTMLInputElement[] {
    if (this.localName !== "select") return [];
    return this.childNodes.filter(
      (c): c is MockHTMLInputElement =>
        c instanceof MockElement && (c as MockElement).localName === "option",
    ) as MockHTMLInputElement[];
  }
}

// ── Touch stub ───────────────────────────────────────────────────────────

class MockTouch {
  identifier: number;
  target: EventTarget;
  clientX: number;
  clientY: number;
  pageX: number;
  pageY: number;
  screenX: number;
  screenY: number;
  radiusX: number;
  radiusY: number;
  rotationAngle: number;
  force: number;
  constructor(init: {
    identifier: number;
    target: EventTarget;
    clientX?: number;
    clientY?: number;
    pageX?: number;
    pageY?: number;
    screenX?: number;
    screenY?: number;
    radiusX?: number;
    radiusY?: number;
    rotationAngle?: number;
    force?: number;
  }) {
    this.identifier = init.identifier;
    this.target = init.target;
    this.clientX = init.clientX ?? 0;
    this.clientY = init.clientY ?? 0;
    this.pageX = init.pageX ?? 0;
    this.pageY = init.pageY ?? 0;
    this.screenX = init.screenX ?? 0;
    this.screenY = init.screenY ?? 0;
    this.radiusX = init.radiusX ?? 0;
    this.radiusY = init.radiusY ?? 0;
    this.rotationAngle = init.rotationAngle ?? 0;
    this.force = init.force ?? 0;
  }
}

// ── Image stub ───────────────────────────────────────────────────────────

class MockImage {
  src = "";
  crossOrigin: string | null = null;
  referrerPolicy = "";
  decoding = "";
  fetchPriority = "";
  naturalWidth = 0;
  naturalHeight = 0;
  width = 0;
  height = 0;
  onload: ((ev: unknown) => void) | null = null;
  onerror: ((ev: unknown) => void) | null = null;
}

// ── Document stub ────────────────────────────────────────────────────────

const body = new MockElement("BODY");
const head = new MockElement("HEAD");
const documentElement = new MockElement("HTML");
documentElement.appendChild(head);
documentElement.appendChild(body);

const docListeners = new Map<string, Set<Function>>();

const mockDocument: Record<string, any> = {
  nodeType: 9, // DOCUMENT_NODE
  nodeName: "#document",
  body,
  head,
  documentElement,
  defaultView: null as any, // set later
  childNodes: [documentElement],
  firstChild: documentElement,
  get ownerDocument() {
    return null;
  }, // document's ownerDocument is null per spec
  contains(node: any) {
    return documentElement.contains(node);
  },
  createElement(tag: string) {
    const lower = tag.toLowerCase();
    if (lower === "input" || lower === "textarea" || lower === "select" || lower === "option") {
      return new MockHTMLInputElement(tag);
    }
    return new MockElement(tag);
  },
  createElementNS(_ns: string, tag: string) {
    return new MockElement(tag);
  },
  createTextNode(text: string) {
    const node = new MockNode();
    node.nodeType = 3; // TEXT_NODE
    node.nodeName = "#text";
    node.textContent = text;
    return node;
  },
  createDocumentFragment() {
    const frag = new MockElement("FRAGMENT");
    (frag as any).nodeType = 11; // DOCUMENT_FRAGMENT_NODE
    return frag;
  },
  createComment(_text?: string) {
    const node = new MockNode();
    node.nodeType = 8; // COMMENT_NODE
    node.nodeName = "#comment";
    return node;
  },
  createEvent(type: string) {
    if (type === "MouseEvents" || type === "MouseEvent") return new MockMouseEvent("unknown");
    return new MockEvent("unknown");
  },
  getElementById(id: string) {
    return documentElement.querySelector(`#${id}`);
  },
  querySelector(selector: string) {
    return documentElement.querySelector(selector);
  },
  querySelectorAll(selector: string) {
    return documentElement.querySelectorAll(selector);
  },
  getElementsByTagName(tag: string) {
    return documentElement.getElementsByTagName(tag);
  },
  addEventListener(type: string, fn: Function, options?: any) {
    if (!docListeners.has(type)) docListeners.set(type, new Set());
    docListeners.get(type)?.add(fn);
    const signal = options?.signal as AbortSignal | undefined;
    if (signal) {
      signal.addEventListener("abort", () => {
        docListeners.get(type)?.delete(fn);
      });
    }
  },
  removeEventListener(type: string, fn: Function, _options?: any) {
    docListeners.get(type)?.delete(fn);
  },
  dispatchEvent(event: any) {
    const fns = docListeners.get(event.type);
    if (fns) for (const fn of fns) fn(event);
    return true;
  },
  execCommand(_command: string) {
    return true;
  },
  // React feature-detection: "oninput" in document → true enables native input event support
  oninput: null,
  onselectionchange: null,
  // React accesses these
  activeElement: null,
  implementation: {
    createHTMLDocument(title?: string) {
      return mockDocument;
    },
    hasFeature() {
      return true;
    },
  },
};

// ── Window stub ──────────────────────────────────────────────────────────

const windowListeners = new Map<string, Set<Function>>();

const mockWindow: Record<string, any> = {
  document: mockDocument,
  navigator: { userAgent: "bun-test", platform: "test" },
  location: {
    href: "https://localhost",
    origin: "https://localhost",
    protocol: "https:",
    hostname: "localhost",
    pathname: "/",
    search: "",
    hash: "",
  },
  getComputedStyle: () =>
    new Proxy({} as CSSStyleDeclaration, {
      get: (_t, p) => (typeof p === "string" ? "" : undefined),
    }),
  requestAnimationFrame: (cb: Function) => setTimeout(cb, 0) as unknown as number,
  cancelAnimationFrame: (id: number) => clearTimeout(id),
  addEventListener(type: string, fn: Function, options?: any) {
    if (!windowListeners.has(type)) windowListeners.set(type, new Set());
    windowListeners.get(type)?.add(fn);
    const signal = options?.signal as AbortSignal | undefined;
    if (signal) {
      signal.addEventListener("abort", () => {
        windowListeners.get(type)?.delete(fn);
      });
    }
  },
  removeEventListener(type: string, fn: Function, _options?: any) {
    windowListeners.get(type)?.delete(fn);
  },
  dispatchEvent(event: any) {
    const fns = windowListeners.get(event.type);
    if (fns) for (const fn of fns) fn(event);
    return true;
  },
  open() {
    return null;
  },
  close() {},
  focus() {},
  blur() {},
  innerWidth: 1024,
  innerHeight: 768,
  outerWidth: 1024,
  outerHeight: 768,
  devicePixelRatio: 1,
  scrollX: 0,
  scrollY: 0,
  pageXOffset: 0,
  pageYOffset: 0,
  screen: {
    width: 1024,
    height: 768,
    availWidth: 1024,
    availHeight: 768,
    colorDepth: 24,
    pixelDepth: 24,
  },
  matchMedia(_query: string) {
    return {
      matches: false,
      media: _query,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      onchange: null,
      dispatchEvent() {
        return true;
      },
    };
  },
  HTMLIFrameElement: MockElement,
  HTMLElement: MockElement,
  HTMLInputElement: MockHTMLInputElement,
  HTMLTextAreaElement: MockHTMLInputElement,
  HTMLSelectElement: MockHTMLInputElement,
  HTMLDivElement: MockElement,
  HTMLSpanElement: MockElement,
  HTMLCanvasElement: MockElement,
  Element: MockElement,
  Node: MockNode,
  Event: MockEvent,
  MouseEvent: MockMouseEvent,
  KeyboardEvent: MockKeyboardEvent,
  DocumentFragment: MockElement,
  Touch: MockTouch,
  performance: typeof performance !== "undefined" ? performance : { now: () => Date.now() },
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  queueMicrotask:
    typeof queueMicrotask !== "undefined"
      ? queueMicrotask
      : (fn: () => void) => Promise.resolve().then(fn),
};

// Wire up circular reference
mockDocument.defaultView = mockWindow;
_mockDocument = mockDocument;

// ── Register globals ─────────────────────────────────────────────────────

const g = globalThis as any;

if (typeof g.document === "undefined") g.document = mockDocument;
if (typeof g.window === "undefined") g.window = mockWindow;
if (typeof g.self === "undefined") g.self = mockWindow;
if (typeof g.navigator === "undefined") g.navigator = mockWindow.navigator;
if (typeof g.location === "undefined") g.location = mockWindow.location;
if (typeof g.Event === "undefined") g.Event = MockEvent;
if (typeof g.CustomEvent === "undefined") g.CustomEvent = MockEvent;
if (typeof g.MouseEvent === "undefined") g.MouseEvent = MockMouseEvent;
if (typeof g.KeyboardEvent === "undefined") g.KeyboardEvent = MockKeyboardEvent;
if (typeof g.WheelEvent === "undefined") g.WheelEvent = MockWheelEvent;
if (typeof g.TouchEvent === "undefined") g.TouchEvent = MockTouchEvent;
if (typeof g.FocusEvent === "undefined") g.FocusEvent = MockFocusEvent;
if (typeof g.InputEvent === "undefined") g.InputEvent = MockInputEvent;
if (typeof g.UIEvent === "undefined") g.UIEvent = MockEvent;
if (typeof g.AnimationEvent === "undefined") g.AnimationEvent = MockEvent;
if (typeof g.TransitionEvent === "undefined") g.TransitionEvent = MockEvent;
if (typeof g.ClipboardEvent === "undefined") g.ClipboardEvent = MockEvent;
if (typeof g.DragEvent === "undefined") g.DragEvent = MockMouseEvent;
if (typeof g.PointerEvent === "undefined") g.PointerEvent = MockMouseEvent;
if (typeof g.CompositionEvent === "undefined") g.CompositionEvent = MockEvent;
if (typeof g.HTMLElement === "undefined") g.HTMLElement = MockElement;
if (typeof g.HTMLInputElement === "undefined") g.HTMLInputElement = MockHTMLInputElement;
if (typeof g.HTMLDivElement === "undefined") g.HTMLDivElement = MockElement;
if (typeof g.HTMLSpanElement === "undefined") g.HTMLSpanElement = MockElement;
if (typeof g.HTMLAnchorElement === "undefined") g.HTMLAnchorElement = MockElement;
if (typeof g.HTMLButtonElement === "undefined") g.HTMLButtonElement = MockElement;
if (typeof g.HTMLFormElement === "undefined") g.HTMLFormElement = MockElement;
if (typeof g.HTMLSelectElement === "undefined") g.HTMLSelectElement = MockHTMLInputElement;
if (typeof g.HTMLTextAreaElement === "undefined") g.HTMLTextAreaElement = MockHTMLInputElement;
if (typeof g.HTMLCanvasElement === "undefined") g.HTMLCanvasElement = MockElement;
if (typeof g.HTMLImageElement === "undefined") g.HTMLImageElement = MockElement;
if (typeof g.HTMLVideoElement === "undefined") g.HTMLVideoElement = MockElement;
if (typeof g.HTMLMediaElement === "undefined") g.HTMLMediaElement = MockElement;
if (typeof g.SVGElement === "undefined") g.SVGElement = MockElement;
if (typeof g.Element === "undefined") g.Element = MockElement;
if (typeof g.Node === "undefined") g.Node = MockNode;
if (typeof g.DocumentFragment === "undefined") g.DocumentFragment = MockElement;
if (typeof g.Image === "undefined") g.Image = MockImage;
if (typeof g.Touch === "undefined") g.Touch = MockTouch;
if (typeof g.Text === "undefined") g.Text = MockNode;
if (typeof g.Comment === "undefined") g.Comment = MockNode;
if (typeof g.MutationObserver === "undefined") {
  g.MutationObserver = class {
    observe() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  };
}
if (typeof g.ResizeObserver === "undefined") {
  g.ResizeObserver = class {
    observe() {}
    disconnect() {}
    unobserve() {}
  };
}
if (typeof g.IntersectionObserver === "undefined") {
  g.IntersectionObserver = class {
    observe() {}
    disconnect() {}
    unobserve() {}
    takeRecords() {
      return [];
    }
  };
}
if (typeof g.getComputedStyle === "undefined") g.getComputedStyle = mockWindow.getComputedStyle;
if (typeof g.requestAnimationFrame === "undefined")
  g.requestAnimationFrame = mockWindow.requestAnimationFrame;
if (typeof g.cancelAnimationFrame === "undefined")
  g.cancelAnimationFrame = mockWindow.cancelAnimationFrame;
if (typeof g.matchMedia === "undefined") g.matchMedia = mockWindow.matchMedia;

// Node type constants
if (!g.Node.ELEMENT_NODE) {
  g.Node.ELEMENT_NODE = 1;
  g.Node.TEXT_NODE = 3;
  g.Node.COMMENT_NODE = 8;
  g.Node.DOCUMENT_NODE = 9;
  g.Node.DOCUMENT_FRAGMENT_NODE = 11;
}
