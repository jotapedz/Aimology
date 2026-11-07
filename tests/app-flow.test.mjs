import test from 'node:test';
import assert from 'node:assert/strict';
import {TASKS} from '../dist/engine.js';
// Minimal DOM/canvas doubles exercise application state, not browser rendering.
test('practice, pause/resume and complete diagnosis persist through the application flow',async()=>{
  const documentEvents=new Map(),windowEvents=new Map(),nodes=new Map(),storage=new Map();
  let now=1000,animation=null;
  const emit=(events,type,event={})=>(events.get(type)||[]).forEach(fn=>fn(event));
  const add=(events,type,fn)=>events.set(type,[...(events.get(type)||[]),fn]);
  const context=new Proxy({},{get:()=>()=>{}});
  class Element{
    constructor(){this.innerHTML='';this.textContent='';this.open=false;this.events=new Map();this.classList={add(){},remove(){},toggle(){}};}
    addEventListener(type,fn){add(this.events,type,fn);}
    setAttribute(){} removeAttribute(){}
    getContext(){return context;}
    getBoundingClientRect(){return {width:1280,height:720};}
    showModal(){this.open=true;}close(){this.open=false;}
    async requestPointerLock(){document.pointerLockElement=this;emit(documentEvents,'pointerlockchange');}
  }
  const get=key=>{if(!nodes.has(key))nodes.set(key,new Element());return nodes.get(key);};
  globalThis.document={querySelector:get,querySelectorAll:()=>[],addEventListener:(t,f)=>add(documentEvents,t,f),pointerLockElement:null,hidden:false,exitPointerLock(){this.pointerLockElement=null;emit(documentEvents,'pointerlockchange');}};
  globalThis.window={addEventListener:(t,f)=>add(windowEvents,t,f),scrollTo(){}};
  let hash='#dashboard';
  globalThis.location={get hash(){return hash;},set hash(value){hash=value.startsWith('#')?value:'#'+value;}};
  globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
  globalThis.HTMLCanvasElement=Element;
  globalThis.matchMedia=()=>({matches:false});
  globalThis.devicePixelRatio=1;
  globalThis.requestAnimationFrame=fn=>{animation=fn;return 1;};
  globalThis.cancelAnimationFrame=()=>{animation=null;};
  Object.defineProperty(globalThis,'performance',{configurable:true,value:{now:()=>now}});
  globalThis.FormData=class{constructor(form){this.values=form.values;}get(k){return this.values[k]??null;}has(k){return k in this.values;}};
  await import('../dist/app.js?test-flow');
  const advance=seconds=>{const steps=Math.ceil(seconds*60);for(let i=0;i<steps;i++){now+=1000/60;const callback=animation;animation=null;if(callback)callback(now);}};
  const submit=(id,values)=>emit(documentEvents,'submit',{preventDefault(){},target:{id,values}});
  assert.match(get('#main').innerHTML,/Biblioteca de exercícios/);
  for(const task of TASKS){
    submit('practice-form',{task,seconds:'30'});
    assert.equal(get('#arena').open,true);
    await get('#begin-round').onclick();
    advance(4);
    if(task==='flick'){
      emit(windowEvents,'blur');
      assert.match(get('#arena-overlay').innerHTML,/Rodada pausada/);
      const before=get('#arena-stats').textContent;advance(5);assert.equal(get('#arena-stats').textContent,before);
      await get('#resume-round').onclick();advance(4);
    }
    advance(31);
    const records=JSON.parse(storage.get('iamira.practiceHistory'));
    assert.equal(records[0].trial.task,task);
    assert.equal(records[0].trial.durationMs,30000);
    assert.ok(Math.abs(records[0].trial.telemetry.sampleMs-30000)<1);
    assert.equal(records[0].version,2);
    assert.match(get('#arena-overlay').innerHTML,/TREINO REGISTRADO/);
    get('#end-practice').onclick();
  }
  assert.equal(JSON.parse(storage.get('iamira.practiceHistory')).length,6);
  submit('diagnostic-form',{dpi:'800',sens:'.35',protocol:'quick',range:'wide'});
  for(let i=0;i<15;i++){
    await get('#begin-round').onclick();advance(19);
    const pending=JSON.parse(storage.get('iamira.pending'));assert.equal(pending.trials.length,i+1);
    if(i===0){get('#exit-arena').onclick();emit(documentEvents,'click',{target:{closest:()=>({dataset:{action:'resume'}})}});}
    else get('#next-round').onclick();
  }
  const sessions=JSON.parse(storage.get('iamira.history'));
  assert.equal(sessions.length,1);assert.equal(sessions[0].version,2);assert.equal(sessions[0].trials.length,15);assert.equal(sessions[0].result.recommendation,null);
  assert.equal(JSON.parse(storage.get('iamira.pending')),null);assert.equal(get('#arena').open,false);
  emit(windowEvents,'hashchange');assert.match(get('#main').innerHTML,/RESULTADO INCONCLUSIVO/);
  assert.ok(!get('#main').innerHTML.includes('NaN'));
});
