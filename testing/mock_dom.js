// cSpell:ignore OPFS
/**
 * @fileoverview Shared zero-dependency mock DOM and browser API fixture for headless Node.js test suites.
 *
 * Protocols: VSRP-001 / SDCP-001 / PERSIST-001 / MPFS-001
 * Authority: Deterministic Test Infrastructure SSOT
 *
 * Provides a unified browser VM execution context containing:
 * - Canvas2D mock context (drawing, path, gradient, text metrics, transform)
 * - DOM Element and Document hierarchy mock
 * - LocalStorage in-memory key-value store
 * - OPFS (Origin Private File System) virtual filesystem mock
 * - MockWorker thread-safe synchronous stub
 * - Browser globals (Blob, URL, TextEncoder, structuredClone, rAF, btoa/atob)
 */

const vm = require('node:vm');

/**
 * Creates a synthetic DOM Element mock with full Canvas 2D and classList support.
 * @param {string} [id='']
 * @param {string} [tag='div']
 * @returns {Record<string, any>}
 */
function createMockElement(id = '', tag = 'div') {
  /** @type {Set<string>} */
  const classes = new Set();
  const el = {
    id,
    tagName: tag.toUpperCase(),
    getContext: () => ({
      createImageData: (/** @type {number} */ w = 1, /** @type {number} */ h = 1) => ({
        data: new Uint8ClampedArray(w * h * 4),
        width: w,
        height: h,
      }),
      getImageData: (/** @type {number} */ _sx = 0, /** @type {number} */ _sy = 0, /** @type {number} */ sw = 1, /** @type {number} */ sh = 1) => ({
        data: new Uint8ClampedArray(sw * sh * 4),
        width: sw,
        height: sh,
      }),
      putImageData: () => {},
      drawImage: () => {},
      fillRect: () => {},
      clearRect: () => {},
      strokeRect: () => {},
      fillText: () => {},
      strokeText: () => {},
      createRadialGradient: () => ({ addColorStop: () => {} }),
      createLinearGradient: () => ({ addColorStop: () => {} }),
      save: () => {},
      restore: () => {},
      beginPath: () => {},
      closePath: () => {},
      clip: () => {},
      arc: () => {},
      ellipse: () => {},
      rect: () => {},
      roundRect: () => {},
      bezierCurveTo: () => {},
      quadraticCurveTo: () => {},
      fill: () => {},
      stroke: () => {},
      moveTo: () => {},
      lineTo: () => {},
      translate: () => {},
      rotate: () => {},
      scale: () => {},
      setTransform: () => {},
      resetTransform: () => {},
      measureText: () => ({ width: 10 }),
    }),
    width: 480,
    height: 260,
    toDataURL: () => 'data:image/png;base64,mock',
    classList: {
      _classes: classes,
      /**
       * @param {...string} cls
       */
      add: function(...cls) {
        cls.forEach((c) => classes.add(c));
      },
      /**
       * @param {...string} cls
       */
      remove: function(...cls) {
        cls.forEach((c) => classes.delete(c));
      },
      /**
       * @param {string} c
       * @param {boolean} [force]
       */
      toggle: function(c, force) {
        if (force !== undefined) {
          if (force) {
            classes.add(c);
          } else {
            classes.delete(c);
          }
        } else if (classes.has(c)) {
          classes.delete(c);
        } else {
          classes.add(c);
        }
      },
      /**
       * @param {string} c
       * @returns {boolean}
       */
      contains: function(c) {
        return classes.has(c);
      },
    },
    addEventListener: () => {},
    removeEventListener: () => {},
    style: {
      setProperty: () => {},
      removeProperty: () => {},
      getPropertyValue: () => '',
    },
    innerHTML: '',
    textContent: '',
    /** @type {any[]} */
    children: [],
    querySelector: () => createMockElement(),
    querySelectorAll: () => [createMockElement()],
    /**
     * @param {any} child
     * @returns {any}
     */
    appendChild: function(child) {
      this.children.push(child);
      return child;
    },
    setAttribute: () => {},
    getAttribute: () => null,
    dataset: {},
  };
  return el;
}

/**
 * Creates a mock writable stream for an OPFS file entry.
 * @param {{ _data: string }} fileEntry
 * @param {Record<string, any>} [writeOptions]
 * @returns {Record<string, any>}
 */
function createMockWritableStream(fileEntry, writeOptions) {
  let seekPos = writeOptions?.keepExistingData ? fileEntry._data.length : 0;
  return {
    /**
     * @param {number} pos
     */
    seek: async (pos) => {
      seekPos = pos;
    },
    /**
     * @param {string} data
     */
    write: async (data) => {
      fileEntry._data = fileEntry._data.slice(0, seekPos) + data;
      seekPos += data.length;
    },
    close: async () => {},
  };
}

/**
 * Creates a mock OPFS file handle.
 * @param {{ _data: string }} fileEntry
 * @returns {Record<string, any>}
 */
function createMockFileHandle(fileEntry) {
  return {
    getFile: async () => ({
      text: async () => fileEntry._data,
      size: fileEntry._data.length,
    }),
    /**
     * @param {Record<string, any>} [writeOptions]
     */
    createWritable: async (writeOptions) => createMockWritableStream(fileEntry, writeOptions),
  };
}

/**
 * Creates a mock OPFS directory handle.
 * @param {Record<string, { _data: string }>} subDirectory
 * @returns {Record<string, any>}
 */
function createMockDirectoryHandle(subDirectory) {
  return {
    /**
     * @param {string} filename
     * @param {{ create?: boolean }} [fileOptions]
     */
    getFileHandle: async (filename, fileOptions) => {
      if (fileOptions?.create && !subDirectory[filename]) {
        subDirectory[filename] = { _data: '' };
      }
      const fileEntry = subDirectory[filename] || { _data: '' };
      return createMockFileHandle(fileEntry);
    },
  };
}

/**
 * Creates a mock OPFS storage object.
 * @returns {{ getDirectory: () => Promise<{ getDirectoryHandle: (name: string) => Promise<any> }> }}
 */
function createMockNavigatorStorage() {
  /** @type {Record<string, Record<string, { _data: string }>>} */
  const mockOPFSFiles = {};
  return {
    getDirectory: async () => ({
      /**
       * @param {string} name
       */
      getDirectoryHandle: async (name) => {
        if (!mockOPFSFiles[name]) {
          mockOPFSFiles[name] = {};
        }
        return createMockDirectoryHandle(mockOPFSFiles[name]);
      },
    }),
  };
}

/**
 * Synchronous mock Web Worker for test environments.
 * @param {string} [_script]
 */
function MockWorker(_script) {
  this._handlers = {};
  this.onmessage = null;
  this.onerror = null;
}
MockWorker.prototype.postMessage = () => {};
MockWorker.prototype.terminate = () => {};
MockWorker.prototype.addEventListener = () => {};
MockWorker.prototype.removeEventListener = () => {};

/**
 * Mock Blob implementation.
 * @param {any[]} [parts]
 * @param {any} [_options]
 */
function MockBlob(parts, _options) {
  this._content = Array.isArray(parts) ? parts.join('') : '';
  this.size = this._content.length;
}

/**
 * Builds a complete mock browser global object.
 * @param {Record<string, any>} [overrides={}]
 * @returns {Record<string, any>}
 */
function createMockDom(overrides = {}) {
  /** @type {Record<string, string>} */
  const storageStore = {};
  const docElement = createMockElement('html', 'html');
  docElement.outerHTML = '<html></html>';

  /** @type {Record<string, any>} */
  const mockDom = {
    document: {
      getElementById: (/** @type {string} */ id) => createMockElement(id),
      createElement: (/** @type {string} */ tag) => createMockElement('', tag),
      querySelector: () => createMockElement(),
      querySelectorAll: () => [createMockElement()],
      createDocumentFragment: () => createMockElement('', 'fragment'),
      body: createMockElement('body', 'body'),
      documentElement: docElement,
    },
    window: {
      addEventListener: () => {},
      removeEventListener: () => {},
    },
    addEventListener: () => {},
    removeEventListener: () => {},
    localStorage: {
      _store: storageStore,
      /**
       * @param {string} k
       * @returns {string | null}
       */
      getItem: (k) => storageStore[k] ?? null,
      /**
       * @param {string} k
       * @param {any} v
       */
      setItem: (k, v) => {
        storageStore[k] = String(v);
      },
      /**
       * @param {string} k
       */
      removeItem: (k) => {
        delete storageStore[k];
      },
    },
    navigator: {
      storage: createMockNavigatorStorage(),
      gpu: null,
    },
    Worker: MockWorker,
    Blob: MockBlob,
    URL: {
      createObjectURL: () => 'blob:mock',
      revokeObjectURL: () => {},
    },
    console,
    Math,
    JSON,
    Date,
    Promise,
    Float32Array,
    Uint32Array,
    Uint8Array,
    Uint8ClampedArray,
    TextEncoder:
      typeof TextEncoder !== 'undefined'
        ? TextEncoder
        : function() {
            return {
              encode: (/** @type {string} */ s) => Buffer.from(s),
            };
          },
    structuredClone:
      typeof structuredClone !== 'undefined'
        ? structuredClone
        : (/** @type {any} */ x) => structuredClone(x),
    WeakSet,
    Map,
    Set,
    Array,
    Object,
    Error,
    parseInt: Number.parseInt,
    parseFloat: Number.parseFloat,
    isNaN: Number.isNaN,
    isFinite: Number.isFinite,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    requestAnimationFrame: (/** @type {Function} */ cb) => setTimeout(cb, 16),
    cancelAnimationFrame: (/** @type {any} */ id) => {
      clearTimeout(id);
    },
    btoa: (/** @type {string} */ s) => Buffer.from(s, 'binary').toString('base64'),
    atob: (/** @type {string} */ s) => Buffer.from(s, 'base64').toString('binary'),
    ...overrides,
  };

  mockDom.window = Object.assign(mockDom.window, mockDom);
  mockDom.globalThis = mockDom.window;
  return mockDom;
}

/**
 * Creates an instantiated vm.Context populated with the mock DOM.
 * @param {Record<string, any>} [overrides={}]
 * @returns {vm.Context}
 */
function createVmContext(overrides = {}) {
  const dom = createMockDom(overrides);
  return vm.createContext(dom);
}

module.exports = {
  createMockElement,
  createMockNavigatorStorage,
  MockWorker,
  MockBlob,
  createMockDom,
  createVmContext,
};
