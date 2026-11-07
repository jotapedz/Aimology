// Version 1 is retained for compatibility with existing sessions.
export const YAW = 0.07;
export const TASKS = ['flick','micro','tracking'];
export const LABELS = {flick:'Flick',micro:'Microajuste',tracking:'Rastreamento'};
export const round = (n,p=3) => Number(n.toFixed(p));
export const clamp = (n,a,b) => Math.min(b,Math.max(a,n));
export const cm360 = (dpi,sens) => 360 * 2.54 / (dpi * sens * YAW);
export function validProfile(p) {return Number.isFinite(p.dpi)&&p.dpi>=100&&p.dpi<=32000&&Number.isFinite(p.sens)&&p.sens>=.01&&p.sens<=5&&Number.isFinite(p.calibration)&&p.calibration>=.1&&p.calibration<=10;}
export function seeded(seed) {return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
export function shuffle(a,rng=Math.random) {const out=[...a];for(let i=out.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
export function makePlan(profile,protocol='complete',seed=Date.now(),refine=false) {
  if(!validProfile(profile)) throw new Error('Perfil inválido');
  const factors = refine ? [.9,.95,1,1.05,1.1] : [.7,.85,1,1.15,1.3];
  const candidates = [...new Set(factors.map(f=>round(clamp(profile.sens*f,.01,5))))];
  const repeats=protocol==='quick'?1:2, seconds=protocol==='quick'?15:20, rng=seeded(seed);
  const rounds=[];
  for(let rep=0;rep<repeats;rep++) for(const task of shuffle(TASKS,rng)) for(const sens of shuffle(candidates,rng)) rounds.push({sens,task,rep,seconds,seed:(seed+rep*101+TASKS.indexOf(task)*997)>>>0});
  return {candidates,rounds,protocol,seed,profile:{...profile},refine};
}
export function scoreTrial(t) {
  if(t.task==='tracking') return clamp(t.onTargetMs/Math.max(1,t.durationMs),0,1)*100;
  const accuracy=t.hits/Math.max(1,t.shots);
  return (t.hits/Math.max(.001,t.durationMs/1000))*Math.sqrt(accuracy);
}
export function analyze(plan,trials) {
  if(trials.length!==plan.rounds.length) return null;
  if(trials.some((t,i)=>t.task!==plan.rounds[i].task||t.sens!==plan.rounds[i].sens||!Number.isFinite(t.durationMs)||t.durationMs<=0)) return null;
  const means = Object.fromEntries(plan.candidates.map(s=>[s,Object.fromEntries(TASKS.map(task=>{const ts=trials.filter(t=>t.sens===s&&t.task===task);return [task,ts.reduce((a,t)=>a+scoreTrial(t),0)/Math.max(1,ts.length)];}))]));
  const best = Object.fromEntries(TASKS.map(task=>[task,Math.max(...plan.candidates.map(s=>means[s][task]))]));
  const rows=plan.candidates.map(sens=>{
    const tasks=Object.fromEntries(TASKS.map(task=>[task,best[task]>0?means[sens][task]/best[task]*100:0]));
    return {sens,tasks,score:tasks.flick*.4+tasks.micro*.4+tasks.tracking*.2};
  }).sort((a,b)=>b.score-a.score||Math.abs(a.sens-plan.profile.sens)-Math.abs(b.sens-plan.profile.sens));
  const signal=TASKS.every(task=>best[task]>0), top=rows[0], gap=top.score-(rows[1]?.score||0);
  const nearby=rows.filter(r=>top.score-r.score<=5);
  const recommendation=signal?[...nearby].sort((a,b)=>Math.abs(a.sens-plan.profile.sens)-Math.abs(b.sens-plan.profile.sens))[0]:null;
  const repeatWinners=[0,1].map(rep=>{
    if(!trials.some(t=>t.rep===rep)) return null;
    return [...plan.candidates].sort((a,b)=>{
      const score=s=>TASKS.reduce((sum,task)=>sum+(best[task]?trials.filter(t=>t.rep===rep&&t.sens===s&&t.task===task).reduce((acc,t)=>acc+scoreTrial(t),0)/best[task]*(task==='tracking'?.2:.4):0),0);
      return score(b)-score(a);
    })[0];
  });
  const stable=signal&&plan.protocol==='complete'&&repeatWinners[0]===repeatWinners[1]&&gap>5;
  return {rows,recommendation,top,signal,gap,stable,tied:nearby.length>1,range:[Math.min(...nearby.map(r=>r.sens)),Math.max(...nearby.map(r=>r.sens))],edge:!!recommendation&&(recommendation.sens===Math.min(...plan.candidates)||recommendation.sens===Math.max(...plan.candidates)),repeatWinners};
}
export function project(yaw,pitch,camYaw,camPitch,width,height) {
  const rad=Math.PI/180,a=yaw*rad,p=pitch*rad,cy=camYaw*rad,cp=camPitch*rad;
  const x=Math.sin(a)*Math.cos(p),y=Math.sin(p),z=Math.cos(a)*Math.cos(p);
  const rx=x*Math.cos(cy)-z*Math.sin(cy),rz=x*Math.sin(cy)+z*Math.cos(cy);
  const ry=y*Math.cos(cp)-rz*Math.sin(cp),depth=y*Math.sin(cp)+rz*Math.cos(cp);
  const focal=height*(16/9)/(2*Math.tan(103*rad/2));
  return {x:width/2+rx/Math.max(.001,depth)*focal,y:height/2-ry/Math.max(.001,depth)*focal,depth,focal};
}
export function angularDistance(a,p,b,q) {const r=Math.PI/180;return Math.acos(clamp(Math.sin(p*r)*Math.sin(q*r)+Math.cos(p*r)*Math.cos(q*r)*Math.cos((a-b)*r),-1,1))/r;}
