/* Phoenix WebLLM Worker Bridge v1.
 * The bridge transports prompts/results only. It grants no filesystem,
 * proposal-commit, capability, or runtime authority to the model.
 * A host adapter must be explicitly supplied; this module never downloads a
 * model and never silently falls back to remote inference.
 */
(function (global) {
  'use strict';

  class PhoenixWebLLMWorkerBridge {
    constructor() { this.worker=null; this.pending=new Map(); this.sequence=0; this.ready=false; }

    static workerScript() {
      return `
'use strict';
let adapter = null;
self.onmessage = async function (event) {
  const m = event.data || {};
  try {
    if (m.type === 'configure') {
      if (typeof self.PhoenixLocalModelAdapter !== 'function') throw new Error('No local model adapter installed.');
      adapter = await self.PhoenixLocalModelAdapter(m.config || {});
      if (!adapter || typeof adapter.generate !== 'function') throw new Error('Adapter must expose generate(prompt, options).');
      self.postMessage({id:m.id,type:'configured'});
      return;
    }
    if (m.type === 'generate') {
      if (!adapter) throw new Error('Local model adapter is not configured.');
      const result = await adapter.generate(m.prompt, m.options || {});
      self.postMessage({id:m.id,type:'result',result:result});
      return;
    }
    if (m.type === 'destroy') {
      if (adapter && typeof adapter.destroy === 'function') await adapter.destroy();
      self.postMessage({id:m.id,type:'destroyed'}); self.close(); return;
    }
    throw new Error('Unknown worker message type: ' + String(m.type));
  } catch (error) {
    self.postMessage({id:m.id,type:'error',error:String(error && error.message || error)});
  }
};`;
    }

    async start(adapterFactory, config) {
      if (typeof global.Worker !== 'function') throw new Error('[PHOENIX] Worker unavailable.');
      if (typeof adapterFactory !== 'function') throw new Error('[PHOENIX] adapterFactory required.');
      const source = PhoenixWebLLMWorkerBridge.workerScript() + '\nself.PhoenixLocalModelAdapter = (' + adapterFactory.toString() + ');';
      const url = global.URL.createObjectURL(new global.Blob([source], {type:'text/javascript'}));
      this.worker = new global.Worker(url); global.URL.revokeObjectURL(url);
      this.worker.onmessage = (e)=>this.#receive(e.data);
      this.worker.onerror = (e)=>this.#rejectAll(new Error(e.message || 'worker error'));
      await this.#request({type:'configure',config:config || {}}); this.ready=true; return this;
    }

    #receive(message) {
      const p=this.pending.get(message.id); if(!p) return; this.pending.delete(message.id);
      if(message.type==='error') p.reject(new Error(message.error)); else p.resolve(message.result === undefined ? true : message.result);
    }
    #rejectAll(error) { for(const p of this.pending.values()) p.reject(error); this.pending.clear(); this.ready=false; }
    #request(payload) { return new Promise((resolve,reject)=>{ if(!this.worker) return reject(new Error('worker not started')); const id='req-'+(++this.sequence); this.pending.set(id,{resolve,reject}); this.worker.postMessage({...payload,id:id}); }); }
    generate(prompt, options) { if(!this.ready) throw new Error('[PHOENIX] worker not ready'); return this.#request({type:'generate',prompt:prompt,options:options||{}}); }
    async destroy() { if(!this.worker) return; try{await this.#request({type:'destroy'});}catch(_){ } this.worker.terminate();this.worker=null;this.ready=false;this.#rejectAll(new Error('worker destroyed')); }
  }

  global.PhoenixWebLLMWorkerBridge=PhoenixWebLLMWorkerBridge;
  if(typeof module!=='undefined'&&module.exports) module.exports=PhoenixWebLLMWorkerBridge;
})(typeof globalThis!=='undefined'?globalThis:this);
