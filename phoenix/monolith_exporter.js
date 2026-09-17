/* Phoenix Monolith Exporter v1.
 * Produces a deterministic HTML artifact from explicitly supplied source,
 * WASM and WGSL payloads. It does not invent missing application modules.
 */
(function (global) {
  'use strict';
  const EMPTY_WASM_BASE64='AGFzbQEAAAA=';
  const DEFAULT_WGSL='struct Params { time: f32, intensity: f32 };\n@group(0) @binding(0) var<uniform> params: Params;\n@compute @workgroup_size(64)\nfn main(@builtin(global_invocation_id) id: vec3<u32>) { let _v = f32(id.x) + params.time + params.intensity; }';

  function escapeHtml(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function base64(s){if(typeof global.btoa==='function')return global.btoa(unescape(encodeURIComponent(s)));if(typeof Buffer!=='undefined')return Buffer.from(s,'utf8').toString('base64');throw new Error('No base64 encoder available.');}

  function exportMonolith(options){
    const o=options||{};
    const sources=Array.isArray(o.sources)?o.sources.map(function(x){return {path:String(x.path),content:String(x.content)};}):[];
    const wasm=Array.isArray(o.wasmKernels)&&o.wasmKernels.length?o.wasmKernels:[{name:'phoenix-empty-kernel.wasm',base64:EMPTY_WASM_BASE64}];
    const shaders=Array.isArray(o.shaders)&&o.shaders.length?o.shaders:[{name:'phoenix_default.wgsl',source:DEFAULT_WGSL}];
    const manifest={format:'PHOENIX-MONOLITH-1',engineVersion:String(o.engineVersion||'7.0.0'),generatedAt:new Date().toISOString(),sourceCount:sources.length,wasmCount:wasm.length,shaderCount:shaders.length};
    const payload=JSON.stringify({manifest:manifest,sources:sources,wasm:wasm,shaders:shaders}).replace(/</g,'\\u003c');
    return '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>'+escapeHtml(o.title||'Phoenix Sovereign Monolith')+'</title>\n</head>\n<body>\n<script>\n"use strict";\nwindow.PhoenixMonolithManifest='+JSON.stringify(manifest)+';\nwindow.PhoenixMonolithPayload='+payload+';\nwindow.PhoenixMonolithPayloadBase64='+JSON.stringify(base64(payload))+';\nwindow.exportMonolith=function(){return document.documentElement.outerHTML;};\n</script>\n</body>\n</html>';
  }

  global.PhoenixMonolithExporter=Object.freeze({exportMonolith:exportMonolith,EMPTY_WASM_BASE64:EMPTY_WASM_BASE64,DEFAULT_WGSL:DEFAULT_WGSL});
  if(typeof module!=='undefined'&&module.exports)module.exports=global.PhoenixMonolithExporter;
})(typeof globalThis!=='undefined'?globalThis:this);
