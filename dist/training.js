import {TASK_INFO,isTracking,seeded,clamp,angularDistance} from './engine.js';
export function createTelemetry(){return {sampleMs:0,errorIntegral:0,errorSamples:[],heatmap:Array(49).fill(0),efficiencies:[],overshoots:0,completedTargets:0,pauses:0,frames:0,nextSample:0,seconds:[]};}
export function beginAcquisition(g){g.acquisition={yaw:g.yaw,pitch:g.pitch,distance:angularDistance(g.yaw,g.pitch,g.target.yaw,g.target.pitch),path:g.path,crossed:false};}
export function observeMovement(g){const a=g.acquisition;if(!a||!['flick','micro','switch'].includes(g.trial.task))return;const dx=g.target.yaw-a.yaw,dy=g.target.pitch-a.pitch,len=Math.hypot(dx,dy);if(len<.01)return;const mx=g.yaw-a.yaw,my=g.pitch-a.pitch,along=(mx*dx+my*dy)/len,lateral=Math.abs(mx*dy-my*dx)/len;if(along>len+g.target.radius&&lateral<g.target.radius*2)a.crossed=true;}
export function recordHit(g){const m=g.telemetry,a=g.acquisition;m.completedTargets++;if(a&&['flick','micro','switch'].includes(g.trial.task)){const travelled=g.path-a.path;if(travelled>0)m.efficiencies.push(clamp(a.distance/travelled,0,1));if(a.crossed)m.overshoots++;}}
export function recordSample(g,dt){
  const ms=dt*1000,m=g.telemetry,distance=angularDistance(g.yaw,g.pitch,g.target.yaw,g.target.pitch);m.sampleMs+=ms;m.frames++;m.errorIntegral+=distance*ms;const on=distance<=g.target.radius;if(isTracking(g.trial.task)&&on)g.onTargetMs+=ms;
  const sec=Math.floor(g.elapsed);m.seconds[sec]??={ms:0,on:0,error:0};m.seconds[sec].ms+=ms;m.seconds[sec].on+=on?ms:0;m.seconds[sec].error+=distance*ms;
  if(g.elapsed>=m.nextSample){m.nextSample=g.elapsed+.05;m.errorSamples.push(distance);}
  const dx=((g.yaw-g.target.yaw+540)%360)-180,dy=g.target.pitch-g.pitch,x=clamp(Math.floor(dx/g.target.radius+3.5),0,6),y=clamp(Math.floor(dy/g.target.radius+3.5),0,6);m.heatmap[y*7+x]+=ms;
}
export function makeMotion(seed,seconds){const rng=seeded(seed),nodes=[{t:0,yaw:-14,pitch:0}];let t=0,yaw=-14,pitch=0,direction=1;while(t<seconds+4){t+=.55+rng()*.8;yaw=clamp(yaw+direction*(9+rng()*16),-27,27);pitch=clamp(pitch+(rng()*2-1)*8,-9,9);nodes.push({t,yaw,pitch});direction*=-1;}return nodes;}
export function motionAt(nodes,time){let i=1;while(i<nodes.length-1&&time>nodes[i].t)i++;const a=nodes[i-1],b=nodes[i],f=clamp((time-a.t)/(b.t-a.t),0,1);return {yaw:a.yaw+(b.yaw-a.yaw)*f,pitch:a.pitch+(b.pitch-a.pitch)*f};}
export function updateTarget(g,time){if(g.trial.task==='tracking'){g.target.yaw=22*Math.sin(time*.85)+5*Math.sin(time*2.1);g.target.pitch=6*Math.sin(time*1.15);}if(g.trial.task==='reactive')Object.assign(g.target,motionAt(g.motion,time));if(g.trial.task==='strafe'){const t=time-g.spawnAt;g.target.yaw=g.target.baseYaw+7*Math.sin(t*2.3+g.target.phase);g.target.pitch=g.target.basePitch+Math.sin(t*1.8)*.7;}}
export function spawn(g){
  const task=g.trial.task;if(isTracking(task)){g.target={yaw:0,pitch:0,radius:TASK_INFO[task].radius};updateTarget(g,g.elapsed);return;}
  if(task==='switch'){
    if(!g.switchTargets?.length){g.switchTargets=[-20,0,20].map(yaw=>({yaw:yaw+(g.rng()*2-1)*4,pitch:(g.rng()*2-1)*9,radius:TASK_INFO.switch.radius}));g.switchIndex=Math.floor(g.rng()*3);}
    else{g.switchTargets[g.switchIndex]={yaw:[-20,0,20][g.switchIndex]+(g.rng()*2-1)*4,pitch:(g.rng()*2-1)*9,radius:TASK_INFO.switch.radius};g.switchIndex=(g.switchIndex+1+(g.rng()>.5?1:0))%3;}
    g.target=g.switchTargets[g.switchIndex];
  }else{const spread=task==='micro'?5:task==='strafe'?17:25,height=task==='micro'?2.7:task==='strafe'?7:11;let target;for(let i=0;i<20;i++){target={yaw:(g.rng()*2-1)*spread,pitch:(g.rng()*2-1)*height,radius:TASK_INFO[task].radius};if(angularDistance(target.yaw,target.pitch,g.target.yaw,g.target.pitch)>(task==='micro'?1.6:8))break;}if(task==='strafe'){target.baseYaw=target.yaw;target.basePitch=target.pitch;target.phase=g.rng()*Math.PI*2;}g.target=target;}
  g.spawnAt=g.elapsed;updateTarget(g,g.elapsed);beginAcquisition(g);
}
