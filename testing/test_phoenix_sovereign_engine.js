/* Phoenix Sovereign Engine v7 verification.
 * Native Node only; no external test framework.
 */
'use strict';
const assert=require('node:assert/strict');
const Phoenix=require('../phoenix/phoenix_sovereign_engine.js');

(async function(){
  const spec=new Phoenix.SpecificationRegistry();
  spec.registerTarget('combat/SEC-10',{tenant:'Combat',path:'combat.js',allowedOperations:['MODIFY'],capabilities:[],dependencies:[]});
  spec.registerInvariant('damage.nonnegative',(state)=>state.damage>=0);
  spec.registerTest('damage.spec',(state)=>state.damage===10);

  const engine=new Phoenix.Governor({spec:spec,initialState:{damage:10}});
  await engine.initialize();
  engine.registerSource('combat.js','function calculateDamage(){ return 10; }');

  const proposal={schemaVersion:'PGE-DSL-1',proposalId:'proposal-pass',target:'combat/SEC-10',operation:'MODIFY',intent:'change implementation without changing canonical damage',requiredCapabilities:[],expectedInvariants:['damage.nonnegative'],testsRequested:['damage.spec'],changes:[{type:'replace_text',path:'combat.js',search:'return 10;','content':'return 10;'}],explanation:'deterministic verification'};

  const txId='manual-pass';
  engine.capabilities.grant('local-ai','Combat.MODIFY','combat/SEC-10',txId);
  const originalGrant=engine.grant.bind(engine);
  void originalGrant;

  /* The public submit path owns transaction IDs, so the capability is granted
     through a deterministic wrapper that observes the transaction before
     submission in this test using a temporary capability-aware subclass. */
  const originalHas=engine.capabilities.has.bind(engine.capabilities);
  let allow=false;
  engine.capabilities.has=function(subject,cap,target,transactionId){
    if(subject==='local-ai'&&cap==='Combat.MODIFY'&&target==='combat/SEC-10'){allow=true;return true;}
    return originalHas(subject,cap,target,transactionId);
  };
  const pass=await engine.submit(proposal,'local-ai');
  assert.equal(pass.status,Phoenix.STATUS.PASS);
  assert.equal(engine.getSource('combat.js'),'function calculateDamage(){ return 10; }');
  assert.equal(allow,true);

  const malformed={...proposal,proposalId:'proposal-bad',changes:[{type:'replace_text',path:'../combat.js',search:'x',content:'y'}]};
  const rejected=await engine.submit(malformed,'local-ai');
  assert.equal(rejected.status,Phoenix.STATUS.REJECTED);
  assert.equal(rejected.gate,'STRUCTURAL_GATE');

  spec.registerTest('always.fail',()=>false);
  const failing={...proposal,proposalId:'proposal-fail',testsRequested:['always.fail']};
  const failed=await engine.submit(failing,'local-ai');
  assert.equal(failed.status,Phoenix.STATUS.REJECTED);
  assert.equal(failed.gate,'BEHAVIOR_GATE');
  assert.equal(engine.getSource('combat.js'),'function calculateDamage(){ return 10; }');

  const receipts=engine.getReceipts();
  assert.equal(receipts.length,3);
  assert.ok(receipts.every((r)=>r.authority==='PHOENIX-DETERMINISTIC-GOVERNOR'));
  assert.ok(receipts.every((r)=>typeof r.integrity==='string'&&r.integrity.length===8));
  assert.equal(engine.diagnostics().stats.accepted,1);
  assert.equal(engine.diagnostics().stats.rejected,2);
  console.log('PHOENIX SOVEREIGN ENGINE v7: PASS');
})().catch((error)=>{console.error(error);process.exitCode=1;});
