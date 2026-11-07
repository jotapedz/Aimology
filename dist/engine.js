import {analyze as legacyAnalyze} from './legacy-engine.js';
export {YAW,round,clamp,cm360,seeded,shuffle,project,angularDistance} from './legacy-engine.js';
import {round,clamp,seeded,shuffle} from './legacy-engine.js';
export const TASKS=['flick','micro','switch','strafe','tracking','reactive'];
export const LEGACY_TASKS=['flick','micro','tracking'];
export const LABELS={flick:'Flick amplo',micro:'Microajuste',switch:'Troca de alvos',strafe:'Clique em movimento',tracking:'Tracking contínuo',reactive:'Tracking reativo'};
export const TASK_INFO={
  flick:{group:'Precisão',weight:.2,radius:1.3,description:'Deslocamentos amplos entre alvos estáticos. Velocidade com parada precisa.'},
  micro:{group:'Precisão',weight:.2,radius:.55,description:'Alvos pequenos e próximos para medir correções finas.'},
  switch:{group:'Transição',weight:.2,radius:1.1,description:'Três alvos visíveis. Acerte o destacado e prepare a próxima transição.'},
  strafe:{group:'Transição',weight:.15,radius:1,description:'Acerte um alvo que se desloca lateralmente. Controle o momento do clique.'},
  tracking:{group:'Controle',weight:.15,radius:1.5,description:'Acompanhe uma trajetória contínua, com mudanças graduais de direção.'},
  reactive:{group:'Controle',weight:.1,radius:1.6,description:'Acompanhe inversões de direção em intervalos variáveis.'},
};
export const PROTOCOLS={
  quick:{label:'Triagem',tasks:LEGACY_TASKS,repeats:1,seconds:15,description:'Uma primeira comparação. Resultado provisório.'},
  complete:{label:'Completo',tasks:TASKS,repeats:2,seconds:15,description:'Seis exercícios, com duas medições por sensibilidade.'},
  deep:{label:'Aprofundado',tasks:TASKS,repeats:3,seconds:20,description:'Três medições por condição para observar variação.'},
};
export const RANGES={
  extended:{label:'Ampla · 0,25× a 6×',factors:[.25,.5,.75,1,1.5,2,3,4,6]},
  wide:{label:'Próxima da atual · −30% a +30%',factors:[.7,.85,1,1.15,1.3]},
  refine:{label:'Refinar · −10% a +10%',factors:[.9,.95,1,1.05,1.1]},
};
// Boolean arguments keep the original v2 calling convention working.
export function rangeKey(range){const key=range===true?'refine':range===false?'wide':range;if(!Object.hasOwn(RANGES,key))throw new Error('Faixa inválida');return key;}
export function rangeCandidates(profile,range='extended'){
  if(!validProfile(profile))throw new Error('Perfil inválido');
  return [...new Set(RANGES[rangeKey(range)].factors.map(f=>round(clamp(profile.sens*f,.01,5))))].sort((a,b)=>a-b);
}
export const mean=a=>a.length?a.reduce((s,n)=>s+n,0)/a.length:0;
export const median=a=>quantile(a,.5);
export function quantile(a,q){if(!a.length)return null;const b=[...a].sort((x,y)=>x-y),i=(b.length-1)*q;return b[Math.floor(i)]+(b[Math.ceil(i)]-b[Math.floor(i)])*(i%1);}
export const deviation=a=>a.length>1?Math.sqrt(mean(a.map(n=>(n-mean(a))**2))):0;
export const isTracking=task=>task==='tracking'||task==='reactive';
export const planTasks=plan=>plan.tasks||[...new Set(plan.rounds.map(r=>r.task))];
export function validProfile(p){return !!p&&Number.isFinite(p.dpi)&&p.dpi>=100&&p.dpi<=32000&&Number.isFinite(p.sens)&&p.sens>=.01&&p.sens<=5&&Number.isFinite(p.calibration)&&p.calibration>=.1&&p.calibration<=10;}
export function makePlan(profile,protocol='complete',seed=Date.now(),range=false){
  if(!validProfile(profile))throw new Error('Perfil inválido');
  const config=PROTOCOLS[protocol];if(!config)throw new Error('Protocolo inválido');
  const key=rangeKey(range),candidates=rangeCandidates(profile,key),rng=seeded(seed);
  const orders=Object.fromEntries(config.tasks.map(t=>[t,shuffle(candidates,rng)])),rounds=[];
  for(let rep=0;rep<config.repeats;rep++)for(const task of shuffle(config.tasks,rng)){
    const order=orders[task],shift=(rep*2)%order.length;
    for(let i=0;i<order.length;i++)rounds.push({sens:order[(i+shift)%order.length],task,rep,seconds:config.seconds,seed:(seed+rep*101+TASKS.indexOf(task)*997)>>>0});
  }
  return {version:2,candidates,rounds,tasks:[...config.tasks],repeats:config.repeats,protocol,seed,profile:{...profile},range:key,refine:key==='refine'};
}
export function scoreTrial(t){if(isTracking(t.task))return clamp(t.onTargetMs/Math.max(1,t.durationMs),0,1)*100;return (t.hits/Math.max(.001,t.durationMs/1000))*Math.sqrt(t.hits/Math.max(1,t.shots));}
export function summarizeTrials(trials){
  const ms=trials.reduce((s,t)=>s+t.durationMs,0),hits=trials.reduce((s,t)=>s+t.hits,0),shots=trials.reduce((s,t)=>s+t.shots,0);
  const times=trials.flatMap(t=>t.reactionTimes||[]),quality=trials.filter(t=>t.telemetry);
  const measured=quality.reduce((s,t)=>s+t.telemetry.sampleMs,0),samples=quality.flatMap(t=>t.telemetry.errorSamples||[]),paths=quality.flatMap(t=>t.telemetry.efficiencies||[]);
  const heat=Array(49).fill(0);quality.forEach(t=>t.telemetry.heatmap?.forEach((v,i)=>{if(i<49)heat[i]+=v;}));
  return {rounds:trials.length,hits,shots,accuracy:shots?hits/shots*100:null,hitsPerSecond:ms?hits/(ms/1000):0,onTargetPercent:ms?trials.reduce((s,t)=>s+t.onTargetMs,0)/ms*100:0,medianMs:median(times),p90Ms:quantile(times,.9),meanError:measured?quality.reduce((s,t)=>s+t.telemetry.errorIntegral,0)/measured:null,p90Error:quantile(samples,.9),efficiency:paths.length?mean(paths)*100:null,overshoots:quality.reduce((s,t)=>s+t.telemetry.overshoots,0),targets:quality.reduce((s,t)=>s+t.telemetry.completedTargets,0),pauses:quality.reduce((s,t)=>s+t.telemetry.pauses,0),lowFpsRounds:quality.filter(t=>t.telemetry.frames/(t.durationMs/1000)<45).length,medianFps:quality.length?median(quality.map(t=>t.telemetry.frames/(t.durationMs/1000))):null,heatmap:heat,samples:samples.length};
}
function validTrial(t,e){
  if(t.task!==e.task||t.sens!==e.sens||t.rep!==e.rep||!Number.isFinite(t.durationMs)||Math.abs(t.durationMs-e.seconds*1000)>50)return false;
  if(!Number.isInteger(t.hits)||!Number.isInteger(t.shots)||t.hits<0||t.shots<t.hits||!Number.isFinite(t.onTargetMs)||t.onTargetMs<0||t.onTargetMs>t.durationMs+1)return false;
  const m=t.telemetry;
  if(!m||!Number.isFinite(m.sampleMs)||Math.abs(m.sampleMs-t.durationMs)>100||!Number.isFinite(m.errorIntegral)||m.errorIntegral<0||!Number.isInteger(m.frames)||m.frames<=0||!Array.isArray(m.errorSamples)||m.errorSamples.some(n=>!Number.isFinite(n)||n<0)||!Array.isArray(m.heatmap)||m.heatmap.length!==49||m.heatmap.some(n=>!Number.isFinite(n)||n<0)||!Array.isArray(m.efficiencies)||m.efficiencies.some(n=>!Number.isFinite(n)||n<0||n>1)||![m.overshoots,m.completedTargets,m.pauses].every(n=>Number.isInteger(n)&&n>=0))return false;
  return true;
}
export function analyze(plan,trials){
  if(!plan.version||plan.version<2)return legacyAnalyze(plan,trials);
  const tasks=planTasks(plan);
  if(!plan.rounds.length||trials.length!==plan.rounds.length||tasks.some(t=>!TASK_INFO[t])||trials.some((t,i)=>!validTrial(t,plan.rounds[i])))return null;
  const weights=tasks.length===3?{flick:.4,micro:.4,tracking:.2}:Object.fromEntries(tasks.map(t=>[t,TASK_INFO[t].weight/tasks.reduce((s,k)=>s+TASK_INFO[k].weight,0)]));
  const groups=Object.fromEntries(plan.candidates.map(s=>[s,Object.fromEntries(tasks.map(task=>[task,trials.filter(t=>t.sens===s&&t.task===task)]))]));
  const means=Object.fromEntries(plan.candidates.map(s=>[s,Object.fromEntries(tasks.map(t=>[t,mean(groups[s][t].map(scoreTrial))]))]));
  const best=Object.fromEntries(tasks.map(t=>[t,Math.max(...plan.candidates.map(s=>means[s][t]))])),reps=[...new Set(plan.rounds.map(t=>t.rep))];
  const rows=plan.candidates.map(sens=>{
    const detail=Object.fromEntries(tasks.map(t=>[t,summarizeTrials(groups[sens][t])])),scores=Object.fromEntries(tasks.map(t=>[t,best[t]>0?means[sens][t]/best[t]*100:0]));
    const repeatScores=reps.map(rep=>tasks.reduce((sum,t)=>sum+(best[t]?mean(groups[sens][t].filter(r=>r.rep===rep).map(scoreTrial))/best[t]*100*weights[t]:0),0));
    const variation=mean(repeatScores)>0?deviation(repeatScores)/mean(repeatScores)*100:0,reasons=[];
    for(const t of tasks){const d=detail[t],ts=groups[sens][t];if(isTracking(t)){if(d.onTargetPercent<2||ts.some(r=>!Number.isFinite(r.angularPath)||r.angularPath<r.durationMs/1000*.25))reasons.push(`${LABELS[t]}: pouco acompanhamento ativo`);}else if(d.hits<5*ts.length)reasons.push(`${LABELS[t]}: menos de 5 acertos por rodada, em média`);if(d.lowFpsRounds>0)reasons.push(`${LABELS[t]}: renderização abaixo de 45 FPS`);}
    return {sens,tasks:scores,score:tasks.reduce((s,t)=>s+scores[t]*weights[t],0),details:detail,repeatScores,variation,minScore:Math.min(...repeatScores),maxScore:Math.max(...repeatScores),eligible:!reasons.length,reasons};
  }).sort((a,b)=>b.score-a.score||Math.abs(a.sens-plan.profile.sens)-Math.abs(b.sens-plan.profile.sens));
  const signal=tasks.every(t=>best[t]>0),top=rows[0],gap=top.score-(rows[1]?.score||0),sufficient=signal&&rows.every(r=>r.eligible),nearby=rows.filter(r=>top.score-r.score<=5);
  const recommendation=sufficient?[...nearby].sort((a,b)=>Math.abs(a.sens-plan.profile.sens)-Math.abs(b.sens-plan.profile.sens))[0]:null;
  const repeatWinners=reps.map((_,i)=>[...rows].sort((a,b)=>b.repeatScores[i]-a.repeatScores[i])[0].sens),stable=sufficient&&reps.length>=2&&repeatWinners.every(s=>s===top.sens)&&gap>5&&top.variation<=15;
  const perTask=tasks.map(task=>{const ranked=[...rows].sort((a,b)=>b.tasks[task]-a.tasks[task]);return {task,best:ranked[0].sens,gap:ranked[0].tasks[task]-(ranked[1]?.tasks[task]||0)};});
  return {version:2,rows,recommendation,top,signal,sufficient,gap,stable,tied:nearby.length>1,range:[Math.min(...nearby.map(r=>r.sens)),Math.max(...nearby.map(r=>r.sens))],edge:!!recommendation&&(recommendation.sens===Math.min(...plan.candidates)||recommendation.sens===Math.max(...plan.candidates)),repeatWinners,perTask,summary:summarizeTrials(trials),weights,tasks,lastChange:reps.length>1?mean(rows.map(r=>r.repeatScores.at(-1)-r.repeatScores[0])):null};
}
