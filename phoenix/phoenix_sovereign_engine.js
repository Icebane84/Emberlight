/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: PHOENIX GOVERNOR KERNEL
 * Document Identifier: VSRP-001-PHOENIX-SOVEREIGN-ENGINE
 * Governing Protocol:  VSRP-001 / PMIP-001 / SDCP-001 / PERSIST-001
 * Authority:           Host SSOT | Deterministic Governance Governor
 * ============================================================================
 *
 * TABLE OF CONTENTS & NAVIGATION ANCHORS:
 *   [SEC-01] Constants, Frozen Primitives & Pure Utilities
 *   [SEC-02] Layer 1: Structural Linter
 *   [SEC-03] Layer 0: Specification Registry
 *   [SEC-04] Layer 0: Capability Registry
 *   [SEC-05] Layer 3: In-Memory Receipt Ledger
 *   [SEC-06] Layer 0: Sovereign Storage (OPFS & FSA)
 *   [SEC-07] Layer 2: Governor & Transaction Pipeline
 *   [SEC-08] Layer 3: AI Repair Loop & Module Export
 * ============================================================================
 */
((global) => {
  //#region [SEC-01] Constants, Frozen Primitives & Pure Utilities
  const VERSION = "7.0.0-ULTIMATE-FUSION";
  const PROTOCOLS = Object.freeze([
    "VSRP-001",
    "PMIP-001",
    "SDCP-001",
    "PERSIST-001",
    "UMB-GOV-01",
    "PRS-SPEC-GOVERNANCE-001",
  ]);
  const STATES = Object.freeze({
    NEW: "NEW",
    READY: "READY",
    TRANSACTION: "TRANSACTION",
    DESTROYED: "DESTROYED",
  });
  const STATUS = Object.freeze({
    PASS: "PASS",
    REJECTED: "REJECTED",
    ERROR: "ERROR",
  });
  const GATES = Object.freeze({
    STRUCTURAL: "STRUCTURAL_GATE",
    CAPABILITY: "CAPABILITY_GATE",
    BEHAVIOR: "BEHAVIOR_GATE",
    ALL: "ALL_GATES",
    EXECUTION: "EXECUTION",
  });

  /** Allowed proposal schema version */
  const SCHEMA_VERSION = "PGE-DSL-1";
  /** Allowed receipt format version */
  const RECEIPT_VERSION = "PGE-RECEIPT-1";
  /** OPFS namespace for all persisted state */
  const OPFS_NAMESPACE = "phoenix-v7";
  /** OPFS filename for append-only receipt journal */
  const JOURNAL_FILE = "receipt-journal.ndjson";
  /** OPFS filename for AST cache manifest */
  const AST_CACHE_FILE = "ast-cache-manifest.json";
  /** OPFS filename for model cache manifest */
  const MODEL_CACHE_FILE = "model-cache-manifest.json";
  /** Maximum entries in the in-memory receipt ledger */
  const LEDGER_LIMIT = 500;
  /** Maximum AST cache entries before LRU eviction */
  const AST_CACHE_LIMIT = 50;
  /** Maximum repair iterations per original proposal ID */
  const REPAIR_LOOP_CAP = 3;
  /** Default capability expiry in governor ticks (proposals processed) */
  const DEFAULT_CAP_EXPIRY = 16;

  /** Regex: valid identifier for IDs, targets, capability names */
  const RE_ID = /^[A-Za-z0-9_.:/-]{1,128}$/;
  const RE_CAP = /^[A-Za-z0-9_.:-]{1,128}$/;

  function assert(ok, message) {
    if (!ok) throw new Error("[PHOENIX] " + message);
  }

  function clone(value) {
    return typeof structuredClone === "function"
      ? structuredClone(value)
      : structuredClone(value);
  }

  function isPlain(value) {
    if (value === null || typeof value !== "object") return false;
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
  }

  /** Deterministic canonical JSON — keys sorted at every level, no circular refs */
  function stable(value) {
    const seen = new WeakSet();
    function normalize(v) {
      if (v === null || typeof v !== "object") return v;
      if (seen.has(v))
        throw new Error("Circular data is forbidden in stable().");
      seen.add(v);
      if (Array.isArray(v)) {
        const a = v.map(normalize);
        seen.delete(v);
        return a;
      }
      const o = {};
      Object.keys(v)
        .sort()
        .forEach((k) => {
          o[k] = normalize(v[k]);
        });
      seen.delete(v);
      return o;
    }
    return JSON.stringify(normalize(value));
  }

  /** FNV-1a 32-bit hash — deterministic, collision-resistant for receipt integrity */
  function hash(text) {
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h.toString(16).padStart(8, "0");
  }

  /** Monotonic ID generator. Prefix + timestamp (base-36) + autoincrement */
  let _seq = 0;
  function uid(prefix) {
    return prefix + "-" + Date.now().toString(36) + "-" + (++_seq).toString(36);
  }

  function isoNow() {
    return new Date().toISOString();
  }
  //#endregion

  //#region [SEC-02] Layer 1: Structural Linter
  /** Audit a single source string for forbidden patterns */
  function lintSource(source) {
    const errors = [];
    if (typeof source !== "string") {
      errors.push("source must be a string");
      return errors;
    }
    if (source.includes("// ..."))
      errors.push('placeholder "// ..." is forbidden');
    if (source.includes("/* ... */"))
      errors.push('placeholder "/* ... */" is forbidden');
    if (source.includes("TODO(impl)"))
      errors.push("placeholder TODO(impl) is forbidden");
    return errors;
  }

  /** Full structural validation of a proposal object per PGE-DSL-1 schema */
  function validateProposalShape(p) {
    const e = [];
    if (!isPlain(p)) return ["proposal must be a plain object"];
    if (p.schemaVersion !== SCHEMA_VERSION)
      e.push("schemaVersion must be " + SCHEMA_VERSION);
    if (!RE_ID.test(String(p.proposalId || "")))
      e.push("proposalId is invalid");
    if (!RE_ID.test(String(p.target || ""))) e.push("target is invalid");
    if (!["CREATE", "MODIFY", "DELETE", "REPLACE"].includes(p.operation))
      e.push("invalid operation");
    if (
      typeof p.intent !== "string" ||
      p.intent.length < 1 ||
      p.intent.length > 4096
    )
      e.push("intent must be 1..4096 characters");
    if (
      !Array.isArray(p.changes) ||
      p.changes.length < 1 ||
      p.changes.length > 64
    )
      e.push("changes must contain 1..64 entries");
    if (!Array.isArray(p.expectedInvariants))
      e.push("expectedInvariants must be an array");
    if (!Array.isArray(p.testsRequested))
      e.push("testsRequested must be an array");
    if (!Array.isArray(p.requiredCapabilities))
      e.push("requiredCapabilities must be an array");

    (p.requiredCapabilities || []).forEach((c) => {
      if (!RE_CAP.test(String(c))) e.push("invalid capability: " + c);
    });

    (p.changes || []).forEach((c, idx) => {
      if (!isPlain(c)) {
        e.push("change[" + idx + "] must be a plain object");
        return;
      }
      const ALLOWED_TYPES = [
        "replace_text",
        "insert_before",
        "insert_after",
        "create_file",
        "delete_file",
      ];
      if (!ALLOWED_TYPES.includes(c.type))
        e.push("change[" + idx + "] unsupported type: " + c.type);
      if (
        typeof c.path !== "string" ||
        c.path.length < 1 ||
        c.path.length > 512
      )
        e.push("change[" + idx + "] invalid path");
      if (
        c.path &&
        (c.path.includes("..") ||
          c.path.startsWith("/") ||
          c.path.includes("\\"))
      )
        e.push("change[" + idx + "] unsafe path traversal");
      if (c.type !== "delete_file" && typeof c.content !== "string")
        e.push("change[" + idx + "] content must be a string");
      if (typeof c.content === "string") {
        const lintErrors = lintSource(c.content);
        lintErrors.forEach((le) => {
          e.push("change[" + idx + "] linter: " + le);
        });
      }
    });
    return e;
  }
  //#endregion

  //#region [SEC-03] Layer 0: Specification Registry
  class SpecificationRegistry {
    constructor() {
      this._targets = new Map();
      this._contracts = new Map();
      this._invariants = new Map();
      this._tests = new Map();
    }

    registerTarget(name, descriptor) {
      assert(RE_ID.test(name), "invalid target name: " + name);
      assert(isPlain(descriptor), "target descriptor must be a plain object");
      this._targets.set(
        name,
        Object.freeze({
          id: name,
          tenant: descriptor.tenant || "unknown",
          path: descriptor.path || name,
          writable: descriptor.writable !== false,
          allowedOperations: Array.isArray(descriptor.allowedOperations)
            ? descriptor.allowedOperations.slice()
            : ["MODIFY"],
          capabilities: Array.isArray(descriptor.capabilities)
            ? descriptor.capabilities.slice()
            : [],
          dependencies: Array.isArray(descriptor.dependencies)
            ? descriptor.dependencies.slice()
            : [],
        }),
      );
    }

    registerContract(name, fn) {
      assert(
        RE_ID.test(name) && typeof fn === "function",
        "invalid contract: " + name,
      );
      this._contracts.set(name, fn);
    }

    registerInvariant(name, fn) {
      assert(
        RE_ID.test(name) && typeof fn === "function",
        "invalid invariant: " + name,
      );
      this._invariants.set(name, fn);
    }

    registerTest(name, fn) {
      assert(
        RE_ID.test(name) && typeof fn === "function",
        "invalid test: " + name,
      );
      this._tests.set(name, fn);
    }

    get targets() {
      return this._targets;
    }
    get contracts() {
      return this._contracts;
    }
    get invariants() {
      return this._invariants;
    }
    get tests() {
      return this._tests;
    }
  }
  //#endregion

  //#region [SEC-04] Layer 0: Capability Registry
  class CapabilityRegistry {
    constructor() {
      this._grants = new Map();
    }

    grant(subject, capability, target, transactionId, expiryTick) {
      assert(RE_CAP.test(capability), "invalid capability: " + capability);
      const key =
        subject + "|" + capability + "|" + target + "|" + transactionId;
      this._grants.set(key, {
        granted: true,
        expiryTick: expiryTick || Infinity,
      });
      return key;
    }

    has(subject, capability, target, transactionId, currentTick) {
      const key =
        subject + "|" + capability + "|" + target + "|" + transactionId;
      const entry = this._grants.get(key);
      if (!entry) return false;
      if (currentTick !== undefined && currentTick > entry.expiryTick) {
        this._grants.delete(key);
        return false;
      }
      return entry.granted;
    }

    clearTransaction(transactionId) {
      const suffix = "|" + transactionId;
      for (const key of this._grants.keys()) {
        if (key.endsWith(suffix)) this._grants.delete(key);
      }
    }

    pruneExpired(currentTick) {
      for (const [key, entry] of this._grants) {
        if (currentTick > entry.expiryTick) this._grants.delete(key);
      }
    }
  }
  //#endregion

  //#region [SEC-05] Layer 3: In-Memory Receipt Ledger
  class ReceiptLedger {
    constructor(limit) {
      this._limit = limit || LEDGER_LIMIT;
      this._items = [];
    }

    append(receipt) {
      this._items.push(clone(receipt));
      if (this._items.length > this._limit) this._items.shift();
    }

    list() {
      return this._items.map(clone);
    }
    latest() {
      return this._items.length
        ? clone(this._items[this._items.length - 1])
        : null;
    }
    get size() {
      return this._items.length;
    }
  }
  //#endregion

  //#region [SEC-06] Layer 0: Sovereign Storage (OPFS & FSA)
  class SovereignStorage {
    constructor(namespace) {
      this._namespace = namespace || OPFS_NAMESPACE;
      this._opfsDir = null;
      this._projectDir = null;
      this._astCache = new Map();
      this._modelManifest = {};
    }

    async initialize() {
      if (
        global.navigator &&
        global.navigator.storage &&
        typeof global.navigator.storage.getDirectory === "function"
      ) {
        try {
          const root = await global.navigator.storage.getDirectory();
          this._opfsDir = await root.getDirectoryHandle(this._namespace, {
            create: true,
          });
          const mm = await this._opfsRead(MODEL_CACHE_FILE);
          if (mm && isPlain(mm)) this._modelManifest = mm;
        } catch (_) {
          this._opfsDir = null;
        }
      }
      return this;
    }

    async _opfsRead(filename) {
      if (!this._opfsDir) return null;
      try {
        const handle = await this._opfsDir.getFileHandle(filename);
        const text = await (await handle.getFile()).text();
        return JSON.parse(text);
      } catch (_) {
        return null;
      }
    }

    async _opfsWrite(filename, value) {
      if (!this._opfsDir) return false;
      const handle = await this._opfsDir.getFileHandle(filename, {
        create: true,
      });
      const writable = await handle.createWritable();
      try {
        await writable.write(JSON.stringify(value));
      } finally {
        await writable.close();
      }
      return true;
    }

    async write(name, value) {
      if (await this._opfsWrite(name + ".json", value)) return true;
      if (global.localStorage) {
        global.localStorage.setItem(
          this._namespace + ":" + name,
          JSON.stringify(value),
        );
        return true;
      }
      return false;
    }

    async read(name) {
      const result = await this._opfsRead(name + ".json");
      if (result !== null) return result;
      if (global.localStorage) {
        const raw = global.localStorage.getItem(this._namespace + ":" + name);
        return raw ? JSON.parse(raw) : null;
      }
      return null;
    }

    async appendJournalEntry(receipt) {
      if (!this._opfsDir) {
        const raw = global.localStorage
          ? global.localStorage.getItem(this._namespace + ":journal") || "[]"
          : "[]";
        const arr = JSON.parse(raw);
        arr.push(receipt);
        if (global.localStorage)
          global.localStorage.setItem(
            this._namespace + ":journal",
            JSON.stringify(arr),
          );
        return;
      }
      try {
        const handle = await this._opfsDir.getFileHandle(JOURNAL_FILE, {
          create: true,
        });
        const existing = await handle.getFile();
        const size = existing.size;
        const line = JSON.stringify(receipt) + "\n";
        const writable = await handle.createWritable({
          keepExistingData: true,
        });
        try {
          await writable.seek(size);
          await writable.write(line);
        } finally {
          await writable.close();
        }
      } catch (err) {
        if (global.console)
          global.console.warn("[PHOENIX/journal]", err.message);
      }
    }

    async readJournal() {
      if (!this._opfsDir) {
        if (global.localStorage) {
          const raw = global.localStorage.getItem(this._namespace + ":journal");
          return raw ? JSON.parse(raw) : [];
        }
        return [];
      }
      try {
        const handle = await this._opfsDir.getFileHandle(JOURNAL_FILE);
        const text = await (await handle.getFile()).text();
        return text
          .trim()
          .split("\n")
          .filter(Boolean)
          .map((line) => {
            try {
              return JSON.parse(line);
            } catch (_) {
              return null;
            }
          })
          .filter(Boolean);
      } catch (_) {
        return [];
      }
    }

    async writeASTCache(sourceHash, astData) {
      if (this._astCache.size >= AST_CACHE_LIMIT) {
        const oldestKey = this._astCache.keys().next().value;
        this._astCache.delete(oldestKey);
      }
      this._astCache.set(sourceHash, astData);
      const manifest = {};
      for (const [k, v] of this._astCache) {
        manifest[k] = { cachedAt: v.cachedAt || isoNow() };
      }
      await this._opfsWrite(AST_CACHE_FILE, manifest);
    }

    readASTCache(sourceHash) {
      return this._astCache.get(sourceHash) || null;
    }

    async registerModelCache(modelId, sizeBytes) {
      this._modelManifest[modelId] = { size: sizeBytes, cachedAt: isoNow() };
      await this._opfsWrite(MODEL_CACHE_FILE, this._modelManifest);
    }

    getModelManifest() {
      return clone(this._modelManifest);
    }

    async selectProjectDirectory() {
      assert(
        typeof global.showDirectoryPicker === "function",
        "File System Access API unavailable in this context.",
      );
      this._projectDir = await global.showDirectoryPicker({
        mode: "readwrite",
      });
      return this._projectDir;
    }

    async readProjectFile(filePath) {
      assert(
        this._projectDir,
        "project directory not authorized — call selectProjectDirectory() first",
      );
      return _traverseRead(this._projectDir, filePath);
    }

    async writeProjectFile(filePath, text) {
      assert(
        this._projectDir,
        "project directory not authorized — call selectProjectDirectory() first",
      );
      assert(
        typeof text === "string",
        "writeProjectFile: text must be a string",
      );
      return _traverseWrite(this._projectDir, filePath, text);
    }

    get namespace() {
      return this._namespace;
    }
    get hasOPFS() {
      return this._opfsDir !== null;
    }
    get hasProject() {
      return this._projectDir !== null;
    }
  }

  async function _traverseRead(root, filePath) {
    const parts = filePath.split("/").filter(Boolean);
    assert(parts.length > 0, "file path must not be empty");
    let dir = root;
    for (let i = 0; i < parts.length - 1; i++) {
      dir = await dir.getDirectoryHandle(parts[i]);
    }
    return (
      await (await dir.getFileHandle(parts[parts.length - 1])).getFile()
    ).text();
  }

  async function _traverseWrite(root, filePath, text) {
    const parts = filePath.split("/").filter(Boolean);
    assert(parts.length > 0, "file path must not be empty");
    let dir = root;
    for (let i = 0; i < parts.length - 1; i++) {
      dir = await dir.getDirectoryHandle(parts[i], { create: true });
    }
    const writable = await (
      await dir.getFileHandle(parts[parts.length - 1], { create: true })
    ).createWritable();
    try {
      await writable.write(text);
    } finally {
      await writable.close();
    }
    return true;
  }
  //#endregion

  //#region [SEC-07] Layer 2: Governor & Transaction Pipeline
  class Governor {
    constructor(options) {
      const o = options || {};
      this._spec = o.spec || new SpecificationRegistry();
      this._caps = o.capabilities || new CapabilityRegistry();
      this._storage = o.storage || new SovereignStorage();
      this._ledger = o.receipts || new ReceiptLedger();
      this._sources = new Map();
      this._state = clone(o.initialState === undefined ? {} : o.initialState);
      this._lifecycle = STATES.NEW;
      this._tick = 0;
      this._stats = { proposals: 0, accepted: 0, rejected: 0, errors: 0 };
      this._activeTx = null;
      this._repairCounters = new Map();
    }

    async initialize() {
      assert(this._lifecycle === STATES.NEW, "governor is already initialized");
      await this._storage.initialize();
      this._lifecycle = STATES.READY;
      return this;
    }

    registerSource(filePath, content, descriptor) {
      assert(
        typeof filePath === "string" && filePath.length > 0,
        "source path required",
      );
      assert(typeof content === "string", "source content must be a string");
      this._sources.set(filePath, {
        content,
        descriptor: clone(descriptor || {}),
        revision: 0,
      });
    }

    getSource(filePath) {
      const entry = this._sources.get(filePath);
      return entry ? entry.content : null;
    }

    grant(subject, target, operation, transactionId) {
      const t = this._spec.targets.get(target);
      assert(t, "unknown target: " + target);
      assert(
        t.allowedOperations.includes(operation),
        "operation not permitted: " + operation,
      );
      const cap = t.tenant + "." + operation;
      const expiryTick = this._tick + DEFAULT_CAP_EXPIRY;
      return this._caps.grant(subject, cap, target, transactionId, expiryTick);
    }

    _buildContext(proposal) {
      const t = this._spec.targets.get(proposal.target);
      assert(t, "unknown target: " + proposal.target);
      return Object.freeze({
        target: clone(t),
        targetSource: this.getSource(t.path),
        dependencies: t.dependencies.map(function (p) {
          return { path: p, content: this.getSource(p) };
        }, this),
        invariants: proposal.expectedInvariants.slice(),
        tests: proposal.testsRequested.slice(),
        capabilities: proposal.requiredCapabilities.slice(),
      });
    }

    _gateStructural(proposal) {
      const errors = validateProposalShape(proposal);
      const t = this._spec.targets.get(proposal.target);
      if (!t) {
        errors.push("unknown target: " + proposal.target);
      } else {
        if (!t.writable) errors.push("target is read-only: " + proposal.target);
        if (!t.allowedOperations.includes(proposal.operation))
          errors.push("operation not permitted: " + proposal.operation);
      }
      return errors;
    }

    _applyChanges(proposal) {
      const before = new Map();
      for (const c of proposal.changes) {
        const old = this._sources.get(c.path);
        before.set(c.path, old ? clone(old) : null);

        if (c.type === "create_file") {
          assert(!old, "file already exists: " + c.path);
          this._sources.set(c.path, {
            content: c.content,
            descriptor: {},
            revision: 0,
          });
          continue;
        }
        if (c.type === "delete_file") {
          assert(old, "file does not exist: " + c.path);
          this._sources.delete(c.path);
          continue;
        }

        assert(old, "file does not exist: " + c.path);
        let text = old.content;
        assert(
          typeof c.search === "string" && c.search.length > 0,
          "search anchor required for " + c.type + " on " + c.path,
        );
        const at = text.indexOf(c.search);
        assert(at >= 0, "search anchor not found in: " + c.path);
        assert(
          text.indexOf(c.search, at + c.search.length) < 0,
          "search anchor is not unique in: " + c.path,
        );

        if (c.type === "replace_text") {
          text =
            text.slice(0, at) + c.content + text.slice(at + c.search.length);
        } else if (c.type === "insert_before") {
          text = text.slice(0, at) + c.content + text.slice(at);
        } else {
          text =
            text.slice(0, at + c.search.length) +
            c.content +
            text.slice(at + c.search.length);
        }

        const postLintErrors = lintSource(text);
        assert(
          postLintErrors.length === 0,
          "post-apply linter: " + postLintErrors.join("; "),
        );

        this._sources.set(c.path, {
          content: text,
          descriptor: old.descriptor,
          revision: old.revision + 1,
        });
      }
      return before;
    }

    _rollback(before) {
      for (const [filePath, value] of before) {
        if (value === null) this._sources.delete(filePath);
        else this._sources.set(filePath, value);
      }
    }

    _gateBehavior(proposal, context) {
      const failures = [];

      for (const name of proposal.expectedInvariants) {
        const fn = this._spec.invariants.get(name);
        if (!fn) {
          failures.push({ name, reason: "invariant not registered" });
          continue;
        }
        try {
          const result = fn(this._state, context, this._sources);
          if (result !== true)
            failures.push({ name, reason: String(result || "returned false") });
        } catch (err) {
          failures.push({ name, reason: err.message });
        }
      }

      for (const name of proposal.testsRequested) {
        const fn = this._spec.tests.get(name);
        if (!fn) {
          failures.push({ name, reason: "test not registered" });
          continue;
        }
        try {
          const result = fn(this._state, context, this._sources);
          if (result !== true)
            failures.push({ name, reason: String(result || "returned false") });
        } catch (err) {
          failures.push({ name, reason: err.message });
        }
      }

      return failures;
    }

    _buildReceipt(proposal, status, gate, details, transactionId) {
      const r = {
        receiptVersion: RECEIPT_VERSION,
        receiptId: uid("receipt"),
        proposalId: proposal.proposalId,
        transactionId: transactionId || null,
        timestamp: isoNow(),
        status,
        gate,
        details: clone(details),
        authority: "PHOENIX-DETERMINISTIC-GOVERNOR",
        protocols: PROTOCOLS.slice(),
      };
      r.integrity = hash(stable(r));
      this._ledger.append(r);
      return r;
    }

    async submit(proposal, subject) {
      assert(
        this._lifecycle === STATES.READY,
        "governor is not ready (state: " + this._lifecycle + ")",
      );
      assert(
        typeof subject === "string" && subject.length > 0,
        "subject must be a non-empty string",
      );

      this._tick += 1;
      this._stats.proposals += 1;
      this._caps.pruneExpired(this._tick);

      const structuralErrors = this._gateStructural(proposal);
      if (structuralErrors.length > 0) {
        this._stats.rejected += 1;
        const receipt = this._buildReceipt(
          proposal,
          STATUS.REJECTED,
          GATES.STRUCTURAL,
          structuralErrors,
          null,
        );
        await this._storage.appendJournalEntry(receipt);
        return receipt;
      }

      this._lifecycle = STATES.TRANSACTION;
      const transactionId = uid("tx");
      this._activeTx = { transactionId, tick: this._tick };

      try {
        const target = this._spec.targets.get(proposal.target);
        const required = [target.tenant + "." + proposal.operation].concat(
          proposal.requiredCapabilities,
        );
        const missing = required.filter(function (cap) {
          return !this._caps.has(
            subject,
            cap,
            proposal.target,
            transactionId,
            this._tick,
          );
        }, this);

        if (missing.length > 0) {
          this._stats.rejected += 1;
          this._lifecycle = STATES.READY;
          this._caps.clearTransaction(transactionId);
          const receipt = this._buildReceipt(
            proposal,
            STATUS.REJECTED,
            GATES.CAPABILITY,
            missing,
            transactionId,
          );
          await this._storage.appendJournalEntry(receipt);
          return receipt;
        }

        const context = this._buildContext(proposal);
        const before = this._applyChanges(proposal);
        const failures = this._gateBehavior(proposal, context);

        if (failures.length > 0) {
          this._rollback(before);
          this._stats.rejected += 1;
          this._lifecycle = STATES.READY;
          this._caps.clearTransaction(transactionId);
          const receipt = this._buildReceipt(
            proposal,
            STATUS.REJECTED,
            GATES.BEHAVIOR,
            failures,
            transactionId,
          );
          await this._storage.appendJournalEntry(receipt);
          return receipt;
        }

        this._stats.accepted += 1;
        this._lifecycle = STATES.READY;
        this._caps.clearTransaction(transactionId);
        const receipt = this._buildReceipt(
          proposal,
          STATUS.PASS,
          GATES.ALL,
          {
            changedPaths: proposal.changes.map((c) => c.path),
            contextDigest: hash(stable(context)),
          },
          transactionId,
        );
        await this._storage.appendJournalEntry(receipt);
        return receipt;
      } catch (err) {
        this._stats.errors += 1;
        this._lifecycle = STATES.READY;
        this._caps.clearTransaction(transactionId);
        const receipt = this._buildReceipt(
          proposal,
          STATUS.ERROR,
          GATES.EXECUTION,
          { message: err.message, stack: err.stack || null },
          transactionId,
        );
        await this._storage.appendJournalEntry(receipt);
        return receipt;
      } finally {
        this._activeTx = null;
      }
    }
    //#endregion

    //#region [SEC-08] Layer 3: AI Repair Loop & Module Export
    async repairLoop(
      receipt,
      originalProposal,
      subject,
      llmBridge,
      proposalParser,
    ) {
      assert(isPlain(receipt), "repairLoop: receipt must be a plain object");
      assert(
        isPlain(originalProposal),
        "repairLoop: originalProposal must be a plain object",
      );
      assert(
        typeof subject === "string" && subject.length > 0,
        "repairLoop: subject required",
      );
      assert(
        llmBridge && typeof llmBridge.generate === "function",
        "repairLoop: llmBridge must expose generate()",
      );
      assert(
        typeof proposalParser === "function",
        "repairLoop: proposalParser must be a function",
      );

      const originId = originalProposal.proposalId;
      const count = this._repairCounters.get(originId) || 0;

      if (count >= REPAIR_LOOP_CAP) {
        return receipt;
      }

      this._repairCounters.set(originId, count + 1);

      const repairPrompt = [
        "PHOENIX GOVERNOR REPAIR REQUEST",
        "Iteration: " + (count + 1) + " of " + REPAIR_LOOP_CAP,
        "Original Proposal ID: " + originId,
        "Rejection Gate: " + receipt.gate,
        "Rejection Details: " + JSON.stringify(receipt.details, null, 2),
        "Original Intent: " + originalProposal.intent,
        "Original Changes: " +
          JSON.stringify(originalProposal.changes, null, 2),
        "",
        "Constraints:",
        "  - Output ONLY a valid PGE-DSL-1 JSON proposal object.",
        '  - schemaVersion must be "PGE-DSL-1".',
        "  - Do NOT include placeholder comments (// ..., /* ... */).",
        '  - Do NOT traverse paths with ".." or leading "/".',
        "  - Resolve the rejection gate: " + receipt.gate,
        "  - Address every failure listed in Rejection Details above.",
      ].join("\n");

      let rawText;
      try {
        rawText = await llmBridge.generate(repairPrompt, {
          maxTokens: 2048,
          temperature: 0.2,
        });
      } catch (bridgeErr) {
        return receipt;
      }

      let repairedProposal;
      try {
        repairedProposal = await proposalParser(rawText);
      } catch (parseErr) {
        return receipt;
      }

      if (!isPlain(repairedProposal)) return receipt;

      repairedProposal = Object.assign({}, repairedProposal, {
        proposalId: uid("repair-" + count),
      });

      const newReceipt = await this.submit(repairedProposal, subject);

      if (newReceipt.status === STATUS.PASS) {
        this._repairCounters.delete(originId);
        return newReceipt;
      }

      return this.repairLoop(
        newReceipt,
        originalProposal,
        subject,
        llmBridge,
        proposalParser,
      );
    }

    getState() {
      return clone(this._state);
    }
    getReceipts() {
      return this._ledger.list();
    }
    getStorage() {
      return this._storage;
    }

    diagnostics() {
      return {
        version: VERSION,
        protocols: PROTOCOLS.slice(),
        lifecycle: this._lifecycle,
        tick: this._tick,
        sourceCount: this._sources.size,
        ledgerSize: this._ledger.size,
        stats: Object.assign({}, this._stats),
        opfsAvailable: this._storage.hasOPFS,
        projectMounted: this._storage.hasProject,
      };
    }

    destroy() {
      this._sources.clear();
      this._caps._grants.clear();
      this._repairCounters.clear();
      this._lifecycle = STATES.DESTROYED;
    }

    get spec() {
      return this._spec;
    }
    get capabilities() {
      return this._caps;
    }
    get storage() {
      return this._storage;
    }
    get ledger() {
      return this._ledger;
    }
  }

  const API = Object.freeze({
    VERSION,
    PROTOCOLS,
    STATES,
    STATUS,
    GATES,
    SCHEMA_VERSION,
    RECEIPT_VERSION,
    REPAIR_LOOP_CAP,
    SpecificationRegistry,
    CapabilityRegistry,
    ReceiptLedger,
    SovereignStorage,
    Governor,
    validateProposalShape,
    lintSource,
    stable,
    hash,
    uid,
  });

  global.PhoenixSovereignEngine = API;
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  //#endregion
})(typeof globalThis !== "undefined" ? globalThis : this);
