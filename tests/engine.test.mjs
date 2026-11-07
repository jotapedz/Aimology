import test from 'node:test';
import assert from 'node:assert/strict';
// Preserve the v1 contract for stored sessions and interrupted diagnoses.
import {cm360,makePlan,analyze,scoreTrial,project,angularDistance,seeded,validProfile} from '../dist/legacy-engine.js';
const profile={dpi:800,sens:.35,calibration:1};
const fakeTrials=(plan,quality=()=>1)=>plan.rounds.map(t=>{const q=quality(t);return {...t,durationMs:t.seconds*1000,hits:60*q,shots:60,onTargetMs:t.seconds*1000*.8*q};});
test('DPI and sensitivity give expected physical rotation, without duplicate DPI scaling',()=>{
  assert.ok(Math.abs(cm360(800,.35)-46.6530612244898)<1e-8);
  assert.equal(cm360(1600,.175),cm360(800,.35));
  assert.equal(cm360(1600,.35),cm360(800,.35)/2);
});
test('complete plan balances every sensitivity, task and repetition',()=>{
  const p=makePlan(profile,'complete',42);
  assert.equal(p.rounds.length,30);assert.deepEqual(p.candidates,[.245,.297,.35,.402,.455]);
  for(const sens of p.candidates)for(const task of ['flick','micro','tracking'])for(const rep of [0,1])assert.equal(p.rounds.filter(t=>t.sens===sens&&t.task===task&&t.rep===rep).length,1);
  for(const task of ['flick','micro','tracking'])for(const rep of [0,1])assert.equal(new Set(p.rounds.filter(t=>t.task===task&&t.rep===rep).map(t=>t.seed)).size,1);
});
test('quick and refinement protocols have correct breadth and duration',()=>{
  const p=makePlan(profile,'quick',1,true);assert.equal(p.rounds.length,15);assert.equal(p.rounds.reduce((s,t)=>s+t.seconds,0),225);assert.equal(p.candidates[0],.315);assert.equal(p.candidates.at(-1),.385);
});
test('order is reproducible and changes across seeds',()=>{
  assert.deepEqual(makePlan(profile,'complete',12),makePlan(profile,'complete',12));
  assert.notDeepEqual(makePlan(profile,'complete',12).rounds,makePlan(profile,'complete',13).rounds);
  const a=seeded(42),b=seeded(42);assert.deepEqual(Array.from({length:20},a),Array.from({length:20},b));
});
test('boundary sensitivities stay in range and eliminate duplicate candidates',()=>{
  for(const sens of [.01,5]){const p=makePlan({...profile,sens});assert.equal(new Set(p.candidates).size,p.candidates.length);assert.ok(p.candidates.every(s=>s>=.01&&s<=5));assert.equal(p.rounds.length,p.candidates.length*6);}
});
test('invalid profile is rejected',()=>{
  for(const p of [{...profile,dpi:0},{...profile,sens:NaN},{...profile,calibration:0}]){assert.equal(validProfile(p),false);assert.throws(()=>makePlan(p));}
});
test('missing or mismatched rounds never produce a recommendation',()=>{
  const p=makePlan(profile),ts=fakeTrials(p);assert.equal(analyze(p,ts.slice(1)),null);
  ts[0].sens=99;assert.equal(analyze(p,ts),null);
});
test('zero signal in any task produces no recommendation',()=>{
  const p=makePlan(profile);let r=analyze(p,fakeTrials(p,()=>0));assert.equal(r.recommendation,null);assert.equal(r.signal,false);
  r=analyze(p,fakeTrials(p,t=>t.task==='tracking'?0:1));assert.equal(r.recommendation,null);
});
test('clear repeated winner is identified as consistent',()=>{
  const p=makePlan(profile,'complete',42),r=analyze(p,fakeTrials(p,t=>t.sens===.402?1:.4));
  assert.equal(r.recommendation.sens,.402);assert.equal(r.top.score,100);assert.equal(r.stable,true);assert.equal(r.tied,false);
});
test('quick result remains provisional even with clear winner',()=>{
  const p=makePlan(profile,'quick',42),r=analyze(p,fakeTrials(p,t=>t.sens===.402?1:.4));assert.equal(r.stable,false);
});
test('near tie favors current sensitivity and reports a range',()=>{
  const p=makePlan(profile),r=analyze(p,fakeTrials(p,t=>t.sens===.35?.99:1));
  assert.equal(r.recommendation.sens,.35);assert.equal(r.tied,true);assert.equal(r.stable,false);assert.deepEqual(r.range,[.245,.455]);
});
test('disagreement between repetition winners prevents consistent label',()=>{
  const p=makePlan(profile),r=analyze(p,fakeTrials(p,t=>t.sens===(t.rep===0?.245:.455)?1:.3));assert.equal(r.stable,false);assert.notEqual(r.repeatWinners[0],r.repeatWinners[1]);
});
test('misses penalize click score and no click cannot earn score',()=>{
  const hit={task:'flick',durationMs:20000,hits:20,shots:20};assert.equal(scoreTrial(hit),1);assert.equal(scoreTrial({...hit,shots:80}),.5);assert.equal(scoreTrial({...hit,hits:0,shots:0}),0);
  assert.equal(scoreTrial({task:'tracking',durationMs:20000,onTargetMs:10000}),50);
});
test('camera projection aligns aim with target at arbitrary orientations',()=>{
  for(const [yaw,pitch]of[[0,0],[32,18],[-90,-40],[170,65]]){const p=project(yaw,pitch,yaw,pitch,1920,1080);assert.ok(Math.abs(p.x-960)<1e-8);assert.ok(Math.abs(p.y-540)<1e-8);assert.ok(p.depth>.9999);}
  assert.ok(project(10,0,0,0,1920,1080).x>960);assert.ok(project(0,10,0,0,1920,1080).y<540);assert.ok(project(180,0,0,0,1920,1080).depth<0);
});
test('angular hit geometry handles center, wraparound and poles',()=>{
  assert.ok(angularDistance(0,0,0,0)<1e-6);assert.ok(Math.abs(angularDistance(179,0,-179,0)-2)<1e-8);assert.ok(angularDistance(0,90,180,90)<1e-6);
});
