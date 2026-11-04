// Deterministic cinematic shot plan: 60 seconds, 30 fps.
// The timeline has no media dependencies and is tested with node --test.
export const FPS = 30;
export const TOTAL = 1800;
export const SHOTS = Object.freeze([
  {id:'hook',a:0,b:115,place:'town',light:'day'},
  {id:'spoon',a:115,b:240,place:'macro',light:'gold'},
  {id:'tank',a:240,b:385,place:'town',light:'day'},
  {id:'leaks',a:385,b:540,place:'town',light:'gold'},
  {id:'paint',a:540,b:670,place:'town',light:'gold'},
  {id:'rupture',a:670,b:790,place:'town',light:'day'},
  {id:'rush',a:790,b:1030,place:'town',light:'day'},
  {id:'firehouse',a:1030,b:1190,place:'town',light:'gold'},
  {id:'physics',a:1190,b:1450,place:'macro',light:'gold'},
  {id:'aftermath',a:1450,b:1640,place:'town',light:'gold'},
  {id:'blueprint',a:1640,b:1800,place:'blueprint',light:'night'},
]);
export const tankStateAt=(frame)=>({intact:frame<688,remnant:frame>=688});
// Camera is intentionally placed ahead of the wave; very near sprites overwhelm it.
export const showRushCharacter=(cameraZ,characterZ)=>characterZ<cameraZ-6;
export const clamp = (x,a=0,b=1)=>Math.min(b,Math.max(a,x));
export const smooth = (x)=>{const u=clamp(x);return u*u*(3-2*u);};

// Bernoulli-inspired pressure-head release with a viscous discharge loss.
// This is a stylized depth-driven surge, not a full Navier-Stokes simulation.
export const GRAVITY_M_S2=9.81;
export const pressureHeadSpeedAt=(headMeters)=>{
  const head=Math.max(0,headMeters);
  return .68*Math.sqrt(2*GRAVITY_M_S2*head);
};
const RELEASE_FRAME=688;
const RAMP_SECONDS=.35;
const DRAG_SECONDS=4.4;
const SETTLED_SPEED_M_S=4.8;
const FIRST_SPEED_M_S=pressureHeadSpeedAt(13.5);
export const surgeSpeedAt=(frame)=>{
  const t=Math.max(0,(frame-RELEASE_FRAME)/FPS);
  return (1-Math.exp(-t/RAMP_SECONDS))*
    (SETTLED_SPEED_M_S+(FIRST_SPEED_M_S-SETTLED_SPEED_M_S)*Math.exp(-t/DRAG_SECONDS));
};
// Analytic integral of surgeSpeedAt: deterministic for any Remotion frame.
export const surgeDistanceAt=(frame)=>{
  const t=Math.max(0,(frame-RELEASE_FRAME)/FPS);
  const k=1/DRAG_SECONDS+1/RAMP_SECONDS;
  return SETTLED_SPEED_M_S*(t-RAMP_SECONDS*(1-Math.exp(-t/RAMP_SECONDS)))+
    (FIRST_SPEED_M_S-SETTLED_SPEED_M_S)*
    (DRAG_SECONDS*(1-Math.exp(-t/DRAG_SECONDS))-(1-Math.exp(-k*t))/k);
};
// A syrup jet leaves a pressured seam, slows horizontally, then falls under gravity.
export const jetParticleAt=(ageSeconds,headMeters,launchHeightMeters,liftMetersPerSecond)=>{
  const t=Math.max(0,ageSeconds);
  return {
    forward:pressureHeadSpeedAt(headMeters)*t/(1+.48*t),
    height:Math.max(0,launchHeightMeters+liftMetersPerSecond*t-.5*GRAVITY_M_S2*t*t)
  };
};
export const shotAt = (frame)=>SHOTS.find(s=>frame>=s.a&&frame<s.b) || SHOTS[SHOTS.length-1];
export const shotProgress=(frame)=>{const s=shotAt(frame);return clamp((frame-s.a)/(s.b-s.a));};
// The tank's torn street-facing wall is at this world-space position.
export const TANK_BREACH=Object.freeze({x:7.3,z:-12});
// The pressure-driven distance is projected down the street; the remainder
// goes into spreading sideways and viscous loss as the syrup fans out.
const STREET_PROJECTION=.58;
export const floodSpreadAt=(frame)=>{
  if(frame<115)return {left:-7.6,right:7.6,trail:37};
  const travel=surgeDistanceAt(frame)*STREET_PROJECTION;
  const centerX=TANK_BREACH.x*(1-smooth(travel/19));
  const halfWidth=Math.min(7.8,.48+travel*.44);
  return {
    left:Math.max(-7.6,centerX-halfWidth),
    right:Math.min(7.6,centerX+halfWidth),
    trail:Math.min(40,4+travel*1.05)
  };
};
export const floodFrontAt=(frame)=>{
  if(frame<115)return -13+frame*0.42;
  if(frame<688)return -35;
  return clamp(TANK_BREACH.z+surgeDistanceAt(frame)*STREET_PROJECTION,TANK_BREACH.z,33);
};
// The surge has a rolling, irregular leading lip and a variable crest height.
// Used by both the top water surface and the curved front curtain.
export const waveProfileAt=(frame,x)=>{
  const front=floodFrontAt(frame)+0.72*Math.sin(x*.5+frame*.046)+0.30*Math.sin(x*1.31-frame*.029);
  const lateral=Math.max(.2,1-.32*Math.pow(Math.abs(x)/7.8,2));
  const height=Math.max(1.7,(.95+2.85*lateral)+.55*Math.sin(x*.74-frame*.034)+.28*Math.cos(x*1.48+frame*.058));
  return {front,height};
};
const KEYS={
 hook:{pos:[1.2,3.0,21],look:[2,3.2,-6],fov:45,roll:-0.038,drift:[-1,0,-3.7]},
 spoon:{pos:[-.8,8.5,9],look:[-1.8,3.4,-1],fov:38,roll:0.02,drift:[0.3,-0.2,-0.8]},
 tank:{pos:[0,4.7,22],look:[9,8,-13],fov:42,roll:-0.026,drift:[-2,1.3,-4.4]},
 leaks:{pos:[20.5,5.8,-5],look:[15.8,4.5,-12.9],fov:31,roll:0.016,drift:[-1.3,0.4,-1.2]},
 paint:{pos:[20.5,5.2,-5],look:[15.8,4.5,-12.9],fov:31,roll:0.016,drift:[-1.4,0,-1.7]},
 rupture:{pos:[1.3,4.3,23],look:[8,7,-11],fov:42,roll:0.024,drift:[-1.2,0.5,-5]},
 rush:{pos:[0,3.9,38],look:[0,3.2,16],fov:46,roll:-0.023,drift:[-0.5,0.3,-4.5]},
 firehouse:{pos:[4,5.7,12],look:[-13.9,5,-9],fov:47,roll:0.018,drift:[-0.5,-0.8,-3]},
 physics:{pos:[0.8,9.6,14],look:[0.2,3,-3],fov:42,roll:-0.02,drift:[-0.6,-1,-3]},
 aftermath:{pos:[-1.4,4.1,19],look:[0,2.5,-10],fov:41,roll:-0.015,drift:[2,0.4,-6]},
 blueprint:{pos:[10.5,10,22],look:[0,8,0],fov:38,roll:0,drift:[-1,0,-3]},
};
export const cameraAt=(frame)=>{
 const s=shotAt(frame),p=shotProgress(frame),k=KEYS[s.id],u=smooth(p);
 const pos=k.pos.map((v,i)=>v+k.drift[i]*u);
 let roll=k.roll*(1-0.45*u);
 const impact=Math.min(Math.abs(frame-689),Math.abs(frame-797),Math.abs(frame-1070));
 if(impact<9){const j=(1-impact/9)**2;pos[0]+=Math.sin(frame*13.4)*0.17*j;pos[1]+=Math.cos(frame*19.2)*0.12*j;roll+=Math.sin(frame*7)*0.033*j;}
 return {pos,look:k.look,fov:k.fov,roll};
};

