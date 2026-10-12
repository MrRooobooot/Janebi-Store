// Minimal fake of the document/<head> APIs the client SEO helpers touch
// (src/lib/headSeo.ts, src/lib/catalogSeo.ts). The repo has no DOM library, so
// the tests install this as globalThis.document. Only the selector shapes those
// helpers use are supported: tag[attr="value"] and #id lookups.

export interface FakeEl {
  tag: string;
  attrs: Record<string, string>;
  textContent: string;
  id: string;
  type: string;
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
  remove(): void;
}

export interface FakeDocument {
  title: string;
  head: {
    querySelector(selector: string): FakeEl | null;
    appendChild(el: FakeEl): FakeEl;
  };
  createElement(tag: string): FakeEl;
  getElementById(id: string): FakeEl | null;
  querySelectorAll(selector: string): FakeEl[];
  /** Every element currently in <head>, in document order. */
  readonly headElements: FakeEl[];
}

export function createFakeDocument(): FakeDocument {
  const head: FakeEl[] = [];

  const makeEl = (tag: string): FakeEl => {
    const attrs: Record<string, string> = {};
    const el: FakeEl = {
      tag,
      attrs,
      textContent: '',
      // `id` and `type` are DOM properties that reflect attributes, as in a browser.
      get id() {
        return attrs.id ?? '';
      },
      set id(v: string) {
        attrs.id = v;
      },
      get type() {
        return attrs.type ?? '';
      },
      set type(v: string) {
        attrs.type = v;
      },
      getAttribute: (name) => attrs[name] ?? null,
      setAttribute: (name, value) => {
        attrs[name] = value;
      },
      remove: () => {
        const i = head.indexOf(el);
        if (i >= 0) head.splice(i, 1);
      },
    };
    return el;
  };

  const matches = (el: FakeEl, selector: string): boolean => {
    if (selector.startsWith('#')) return el.attrs.id === selector.slice(1);
    const m = selector.match(/^(\w+)\[(\w[\w-]*)="([^"]+)"\]$/);
    if (!m) throw new Error(`unsupported selector in fake document: ${selector}`);
    return el.tag === m[1] && el.attrs[m[2]] === m[3];
  };

  return {
    title: '',
    head: {
      querySelector: (selector) => head.find((el) => matches(el, selector)) ?? null,
      appendChild: (el) => {
        head.push(el);
        return el;
      },
    },
    createElement: (tag) => makeEl(tag),
    getElementById: (id) => head.find((el) => el.attrs.id === id) ?? null,
    querySelectorAll: (selector) => head.filter((el) => matches(el, selector)),
    get headElements() {
      return head;
    },
  };
}

/** Install the fake as the global document; returns the uninstall function. */
export function installFakeDocument(doc: FakeDocument): () => void {
  (globalThis as { document?: unknown }).document = doc;
  return () => {
    delete (globalThis as { document?: unknown }).document;
  };
}

/** Add one tag to <head> the way the server shell ships it. */
export function addShellTag(doc: FakeDocument, tag: string, attrs: Record<string, string>): FakeEl {
  const el = doc.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return doc.head.appendChild(el);
}
