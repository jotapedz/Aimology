import test from 'node:test';
import assert from 'node:assert/strict';
import {makePlan,rangeCandidates,analyze,TASKS} from '../dist/engine.js';
import {protocolOptions,rangePreview,diagnostic} from '../dist/views.js';
import {profile,trialsFor} from './fixtures.mjs';

test('extended range spans low to high sensitivity and includes the current setting',()=>{
  const p=makePlan(profile,'quick',42,'extended');
  assert.deepEqual(p.candidates,[.087,.175,.262,.35,.525,.7,1.05,1.4,2.1]);
  assert.equal(p.range,'extended');assert.equal(p.refine,false);
  assert.equal(p.rounds.length,27);assert.equal(p.rounds.reduce((s,r)=>s+r.seconds,0),405);
});
test('all extended candidates receive equal tasks, repeats, duration and seeds',()=>{
  const p=makePlan(profile,'deep',42,'extended');assert.equal(p.rounds.length,162);
  for(const sens of p.candidates)for(const task of TASKS)for(let rep=0;rep<3;rep++){
    const matches=p.rounds.filter(t=>t.sens===sens&&t.task===task&&t.rep===rep);
    assert.equal(matches.length,1);assert.equal(matches[0].seconds,20);
    assert.equal(new Set(p.rounds.filter(t=>t.task===task&&t.rep===rep).map(t=>t.seed)).size,1);
  }
});
test('clipping high values removes duplicates and reduces the real round count',()=>{
  for(const sens of [.01,2,5]){
    const p=makePlan({...profile,sens},'complete',42,'extended');
    assert.ok(p.candidates.every(s=>s>=.01&&s<=5));
    assert.equal(new Set(p.candidates).size,p.candidates.length);
    assert.equal(p.rounds.length,p.candidates.length*12);
  }
  const p=makePlan({...profile,sens:5},'deep',42,'extended');
  assert.deepEqual(p.candidates,[1.25,2.5,3.75,5]);assert.equal(p.rounds.length,72);
});
test('old boolean range calls and narrow range results remain compatible',()=>{
  assert.deepEqual(rangeCandidates(profile,'wide'),makePlan(profile,'quick',42,false).candidates);
  assert.deepEqual(rangeCandidates(profile,'refine'),makePlan(profile,'quick',42,true).candidates);
  assert.throws(()=>makePlan(profile,'quick',42,'invalid'));
});
test('a strong high-sensitivity candidate can win the broad analysis',()=>{
  const p=makePlan(profile,'complete',42,'extended'),r=analyze(p,trialsFor(p,t=>t.sens===1.4?1:.5));
  assert.equal(r.rows.length,9);assert.equal(r.recommendation.sens,1.4);assert.equal(r.stable,true);
});
test('a winner on the highest tested boundary is flagged for further exploration',()=>{
  const p=makePlan(profile,'complete',42,'extended'),r=analyze(p,trialsFor(p,t=>t.sens===2.1?1:.5));
  assert.equal(r.recommendation.sens,2.1);assert.equal(r.edge,true);
});
test('high sensitivity does not bypass existing collection quality requirements',()=>{
  const p=makePlan(profile,'complete',42,'extended'),ts=trialsFor(p);
  ts.find(t=>t.sens===2.1).telemetry.frames=30;
  assert.equal(analyze(p,ts).recommendation,null);
});
test('new diagnosis defaults to broad range and shows exact durations',()=>{
  const html=diagnostic({pending:null,profileFields:()=>'',profile});
  assert.ok(html.includes('value="extended" selected'));
  for(const count of [27,108,162])assert.ok(html.includes(count+' rodadas'));
  for(const minutes of ['6,75 min','27 min','54 min'])assert.ok(html.includes(minutes));
  assert.ok(rangePreview(profile).includes('1680')||rangePreview(profile).includes('1.680'));
});
test('live estimates use selected profile, range and protocol without fixed counts',()=>{
  const p={...profile,sens:5};
  const html=protocolOptions(p,'extended','deep');
  assert.ok(html.includes('value="deep" checked'));assert.ok(html.includes('72 rodadas'));assert.ok(html.includes('24 min'));
  assert.ok(protocolOptions(profile,'refine').includes('60 rodadas'));
  assert.ok(rangePreview({...profile,sens:NaN}).includes('válidos'));
  assert.ok(!protocolOptions({...profile,sens:NaN}).includes('NaN'));
});
