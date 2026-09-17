/* Phoenix Sovereign Engine v7.0.0 — deterministic authority boundary.
 * AI output is an untrusted proposal. This module alone decides whether a
 * proposal can enter a transaction. Browser-native, dependency-free.
 */
(function (global) {
  'use strict';

  const VERSION = '7.0.0';
  const PROTOCOLS = Object.freeze(['VSRP-001','PMIP-001','SDCP-001','PERSIST-001','UMB-GOV-01','PRS-SPEC-GOVERNANCE-001']);
  const STATES = Object.freeze({ NEW:'NEW', READY:'READY', TRANSACTION:'TRANSACTION', DESTROYED:'DESTROYED' });
  const STATUS = Object.freeze({ PASS:'PASS', REJECTED:'REJECTED', ERROR:'ERROR' });
  const ID = /^[A-Za-z0-9_.:/-]{1,128}$/;
  const CAP = /^[A-Za-z0-9_.:-]{1,128}$/;

  function assert(ok, message) { if (!ok) throw new Error('[PHOENIX] ' + message); }
  function clone(value) { return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value)); }
  function plain(value) {
    if (value === null || typeof value !== 'object') return false;
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
  }
  function stable(value) {
    const seen = new WeakSet();
    function normalize(v) {
      if (v === null || typeof v !== 'object') return v;
      if (seen.has(v)) throw new Error('Circular data is forbidden.');
      seen.add(v);
      if (Array.isArray(v)) { const a = v.map(normalize); seen.delete(v); return a; }
      const o = {};
      Object.keys(v).sort().forEach(function (k) { o[k] = normalize(v[k]); });
      seen.delete(v);
      return o;
    }
    return JSON.stringify(normalize(value));
  }
  function hash(text) {
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i += 1) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(16).padStart(8, '0');
  }
  function id(prefix) { return prefix + '-' + Date.now().toString(36) + '-' + (++id.sequence).toString(36); }
  id.sequence = 0;
  function time() { return new Date().toISOString(); }

  function validateProposalShape(p) {
    const e = [];
    if (!plain(p)) return ['proposal must be a plain object'];
    if (p.schemaVersion !== 'PGE-DSL-1') e.push('schemaVersion must be PGE-DSL-1');
    if (!ID.test(String(p.proposalId || ''))) e.push('proposalId is invalid');
    if (!ID.test(String(p.target || ''))) e.push('target is invalid');
    if (!['CREATE','MODIFY','DELETE','REPLACE'].includes(p.operation)) e.push('invalid operation');
    if (typeof p.intent !== 'string' || p.intent.length < 1 || p.intent.length > 4096) e.push('intent must be 1..4096 characters');
    if (!Array.isArray(p.changes) || p.changes.length < 1 || p.changes.length > 64) e.push('changes must contain 1..64 entries');
    if (!Array.isArray(p.expectedInvariants)) e.push('expectedInvariants must be an array');
    if (!Array.isArray(p.testsRequested)) e.push('testsRequested must be an array');
    if (!Array.isArray(p.requiredCapabilities)) e.push('requiredCapabilities must be an array');
    (p.requiredCapabilities || []).forEach(function (c) { if (!CAP.test(String(c))) e.push('invalid capability: ' + c); });
    (p.changes || []).forEach(function (c) {
      if (!plain(c)) { e.push('each change must be an object'); return; }
      if (!['replace_text','insert_before','insert_after','create_file','delete_file'].includes(c.type)) e.push('unsupported change type: ' + c.type);
      if (typeof c.path !== 'string' || c.path.length < 1 || c.path.length > 512) e.push('invalid change path');
      if (c.path && (c.path.includes('..') || c.path.startsWith('/') || c.path.includes('\\'))) e.push('unsafe change path');
      if (c.type !== 'delete_file' && typeof c.content !== 'string') e.push('change content must be text');
      if (typeof c.content === 'string' && c.content.includes('// ...')) e.push('placeholder // ... is forbidden');
    });
    return e;
  }

  class SpecificationRegistry {
    constructor() { this.targets = new Map(); this.contracts = new Map(); this.invariants = new Map(); this.tests = new Map(); }
    registerTarget(name, d) {
      assert(ID.test(name), 'invalid target');
      assert(plain(d), 'target descriptor must be an object');
      this.targets.set(name, Object.freeze({ id:name, tenant:d.tenant || 'unknown', path:d.path || name, writable:d.writable !== false, allowedOperations:Array.isArray(d.allowedOperations) ? d.allowedOperations.slice() : ['MODIFY'], capabilities:Array.isArray(d.capabilities) ? d.capabilities.slice() : [], dependencies:Array.isArray(d.dependencies) ? d.dependencies.slice() : [] }));
    }
    registerContract(name, fn) { assert(ID.test(name) && typeof fn === 'function', 'invalid contract'); this.contracts.set(name, fn); }
    registerInvariant(name, fn) { assert(ID.test(name) && typeof fn === 'function', 'invalid invariant'); this.invariants.set(name, fn); }
    registerTest(name, fn) { assert(ID.test(name) && typeof fn === 'function', 'invalid test'); this.tests.set(name, fn); }
  }

  class CapabilityRegistry {
    constructor() { this.grants = new Map(); }
    grant(subject, capability, target, transactionId) {
      assert(CAP.test(capability), 'invalid capability');
      const key = [subject,capability,target,transactionId].join('|');
      this.grants.set(key, true); return key;
    }
    has(subject, capability, target, transactionId) { return this.grants.has([subject,capability,target,transactionId].join('|')); }
    clear(transactionId) { for (const key of this.grants.keys()) if (key.endsWith('|' + transactionId)) this.grants.delete(key); }
  }

  class ReceiptLedger {
    constructor(limit) { this.limit = limit || 500; this.items = []; }
    append(receipt) { this.items.push(clone(receipt)); if (this.items.length > this.limit) this.items.shift(); }
    list() { return this.items.map(clone); }
    latest() { return this.items.length ? clone(this.items[this.items.length - 1]) : null; }
  }

  class SovereignStorage {
    constructor(namespace) { this.namespace = namespace || 'phoenix-v7'; this.directory = null; this.project = null; }
    async initialize() {
      if (global.navigator && global.navigator.storage && global.navigator.storage.getDirectory) {
        try { const root = await global.navigator.storage.getDirectory(); this.directory = await root.getDirectoryHandle(this.namespace, {create:true}); } catch (_) { this.directory = null; }
      }
      return this;
    }
    async write(name, value) {
      const text = JSON.stringify(value);
      if (this.directory) {
        const handle = await this.directory.getFileHandle(name + '.json', {create:true});
        const writable = await handle.createWritable(); try { await writable.write(text); } finally { await writable.close(); }
        return true;
      }
      if (global.localStorage) { global.localStorage.setItem(this.namespace + ':' + name, text); return true; }
      return false;
    }
    async read(name) {
      if (this.directory) { try { const h = await this.directory.getFileHandle(name + '.json'); return JSON.parse(await (await h.getFile()).text()); } catch (_) { return null; } }
      if (global.localStorage) { const raw = global.localStorage.getItem(this.namespace + ':' + name); return raw ? JSON.parse(raw) : null; }
      return null;
    }
    async selectProjectDirectory() { assert(typeof global.showDirectoryPicker === 'function', 'File System Access API unavailable'); this.project = await global.showDirectoryPicker({mode:'readwrite'}); return this.project; }
    async readProjectFile(path) { assert(this.project, 'project directory not authorized'); return readProject(this.project, path); }
    async writeProjectFile(path, text) { assert(this.project, 'project directory not authorized'); return writeProject(this.project, path, text); }
  }
  async function readProject(root, path) {
    const parts = path.split('/').filter(Boolean); assert(parts.length > 0, 'path required'); let d = root;
    for (let i=0;i<parts.length-1;i+=1) d = await d.getDirectoryHandle(parts[i]);
    return (await (await d.getFileHandle(parts[parts.length-1])).getFile()).text();
  }
  async function writeProject(root, path, text) {
    const parts = path.split('/').filter(Boolean); assert(parts.length > 0, 'path required'); let d = root;
    for (let i=0;i<parts.length-1;i+=1) d = await d.getDirectoryHandle(parts[i], {create:true});
    const w = await (await d.getFileHandle(parts[parts.length-1], {create:true})).createWritable(); try { await w.write(text); } finally { await w.close(); }
    return true;
  }

  class Governor {
    constructor(options) {
      const o = options || {};
      this.spec = o.spec || new SpecificationRegistry(); this.capabilities = o.capabilities || new CapabilityRegistry();
      this.storage = o.storage || new SovereignStorage(); this.receipts = o.receipts || new ReceiptLedger();
      this.sources = new Map(); this.state = clone(o.initialState === undefined ? {} : o.initialState); this.lifecycle = STATES.NEW;
      this.stats = {proposals:0,accepted:0,rejected:0,errors:0}; this.activeTransaction = null;
    }
    async initialize() { assert(this.lifecycle === STATES.NEW, 'already initialized'); await this.storage.initialize(); this.lifecycle = STATES.READY; return this; }
    registerSource(path, content, descriptor) { assert(typeof path === 'string' && typeof content === 'string', 'source path/content required'); this.sources.set(path, {content, descriptor:clone(descriptor || {}), revision:0}); }
    getSource(path) { const x = this.sources.get(path); return x ? x.content : null; }
    grant(subject, target, operation, transactionId) {
      const t = this.spec.targets.get(target); assert(t, 'unknown target ' + target); assert(t.allowedOperations.includes(operation), 'operation not permitted');
      return this.capabilities.grant(subject, t.tenant + '.' + operation, target, transactionId);
    }
    context(proposal) {
      const t = this.spec.targets.get(proposal.target); assert(t, 'unknown target');
      return Object.freeze({ target:clone(t), targetSource:this.getSource(t.path), dependencies:t.dependencies.map((p)=>({path:p,content:this.getSource(p)})), invariants:proposal.expectedInvariants.slice(), tests:proposal.testsRequested.slice(), capabilities:proposal.requiredCapabilities.slice() });
    }
    structural(proposal) {
      const errors = validateProposalShape(proposal); const t = this.spec.targets.get(proposal.target);
      if (!t) errors.push('unknown target ' + proposal.target); else { if (!t.writable) errors.push('target is read-only'); if (!t.allowedOperations.includes(proposal.operation)) errors.push('operation not permitted'); }
      return errors;
    }
    apply(proposal) {
      const before = new Map();
      for (const c of proposal.changes) {
        const old = this.sources.get(c.path); before.set(c.path, old ? clone(old) : null);
        if (c.type === 'create_file') { assert(!old, 'file already exists: ' + c.path); this.sources.set(c.path,{content:c.content,descriptor:{},revision:0}); continue; }
        if (c.type === 'delete_file') { assert(old, 'file does not exist: ' + c.path); this.sources.delete(c.path); continue; }
        assert(old, 'file does not exist: ' + c.path); let text = old.content;
        assert(typeof c.search === 'string' && c.search.length > 0, 'search anchor required'); const at = text.indexOf(c.search); assert(at >= 0, 'search anchor not found: ' + c.path);
        if (text.indexOf(c.search, at + c.search.length) >= 0) assert(false, 'search anchor is not unique: ' + c.path);
        text = c.type === 'replace_text' ? text.slice(0,at) + c.content + text.slice(at+c.search.length) : c.type === 'insert_before' ? text.slice(0,at) + c.content + text.slice(at) : text.slice(0,at+c.search.length) + c.content + text.slice(at+c.search.length);
        assert(!text.includes('// ...'), 'placeholder detected'); this.sources.set(c.path,{content:text,descriptor:old.descriptor,revision:old.revision+1});
      }
      return before;
    }
    restore(before) { for (const [p,v] of before) { if (v === null) this.sources.delete(p); else this.sources.set(p,v); } }
    behavior(proposal, context) {
      const failures=[];
      proposal.expectedInvariants.forEach((name)=>{ const fn=this.spec.invariants.get(name); if(!fn) failures.push({name,reason:'invariant not registered'}); else { try { const r=fn(this.state,context,this.sources); if(r!==true) failures.push({name,reason:r || 'returned false'}); } catch(e){ failures.push({name,reason:e.message}); } } });
      proposal.testsRequested.forEach((name)=>{ const fn=this.spec.tests.get(name); if(!fn) failures.push({name,reason:'test not registered'}); else { try { const r=fn(this.state,context,this.sources); if(r!==true) failures.push({name,reason:r || 'returned false'}); } catch(e){ failures.push({name,reason:e.message}); } } });
      return failures;
    }
    receipt(proposal,status,gate,details,transactionId) {
      const r={receiptVersion:'PGE-RECEIPT-1',receiptId:id('receipt'),proposalId:proposal.proposalId,transactionId:transactionId || null,timestamp:time(),status,gate,details:clone(details),authority:'PHOENIX-DETERMINISTIC-GOVERNOR',protocols:PROTOCOLS.slice()};
      r.integrity=hash(stable(r)); this.receipts.append(r); return r;
    }
    async submit(proposal, subject) {
      assert(this.lifecycle===STATES.READY,'governor is not ready'); assert(typeof subject==='string'&&subject.length>0,'subject required'); this.stats.proposals+=1;
      const structural=this.structural(proposal); if(structural.length){this.stats.rejected+=1;return this.receipt(proposal,STATUS.REJECTED,'STRUCTURAL_GATE',structural);}
      this.lifecycle=STATES.TRANSACTION; const transactionId=id('tx'); this.activeTransaction={transactionId,before:clone(this.state)};
      try {
        const required=[this.spec.targets.get(proposal.target).tenant+'.'+proposal.operation].concat(proposal.requiredCapabilities); const missing=required.filter((c)=>!this.capabilities.has(subject,c,proposal.target,transactionId));
        if(missing.length){this.stats.rejected+=1;this.lifecycle=STATES.READY;this.capabilities.clear(transactionId);return this.receipt(proposal,STATUS.REJECTED,'CAPABILITY_GATE',missing,transactionId);}
        const ctx=this.context(proposal); const before=this.apply(proposal); const failures=this.behavior(proposal,ctx);
        if(failures.length){this.restore(before);this.stats.rejected+=1;this.lifecycle=STATES.READY;this.capabilities.clear(transactionId);return this.receipt(proposal,STATUS.REJECTED,'BEHAVIOR_GATE',failures,transactionId);}
        this.stats.accepted+=1; this.lifecycle=STATES.READY; this.capabilities.clear(transactionId);
        return this.receipt(proposal,STATUS.PASS,'ALL_GATES',{changedPaths:proposal.changes.map((c)=>c.path),contextDigest:hash(stable(ctx))},transactionId);
      } catch(e) { this.stats.errors+=1; this.lifecycle=STATES.READY; this.capabilities.clear(transactionId); return this.receipt(proposal,STATUS.ERROR,'EXECUTION',{message:e.message,stack:e.stack || null},transactionId); }
      finally { this.activeTransaction=null; }
    }
    diagnostics(){return {version:VERSION,protocols:PROTOCOLS.slice(),lifecycle:this.lifecycle,sourceCount:this.sources.size,stats:{...this.stats}};}
    getState(){return clone(this.state);} getReceipts(){return this.receipts.list();}
    destroy(){this.sources.clear();this.capabilities.grants.clear();this.lifecycle=STATES.DESTROYED;}
  }

  const API=Object.freeze({VERSION,PROTOCOLS,STATES,STATUS,SpecificationRegistry,CapabilityRegistry,ReceiptLedger,SovereignStorage,Governor,validateProposalShape,stable,hash});
  global.PhoenixSovereignEngine=API;
  if(typeof module!=='undefined'&&module.exports) module.exports=API;
})(typeof globalThis!=='undefined'?globalThis:this);
