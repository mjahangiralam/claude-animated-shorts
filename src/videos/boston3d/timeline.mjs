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
export const clamp = (x,a=0,b=1)=>Math.min(b,Math.max(a,x));
export const smooth = (x)=>{const u=clamp(x);return u*u*(3-2*u);};
export const shotAt = (frame)=>SHOTS.find(s=>frame>=s.a&&frame<s.b) || SHOTS[SHOTS.length-1];
export const shotProgress=(frame)=>{const s=shotAt(frame);return clamp((frame-s.a)/(s.b-s.a));};
export const floodFrontAt=(frame)=>{
  if(frame<115) return -13+frame*0.42;
  if(frame<670) return -35;
  return clamp(-32+(frame-670)*0.215,-32,33);
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
 spoon:{pos:[-.8,8.5,13],look:[-1.8,3.5,-1.8],fov:43,roll:0.02,drift:[0.4,-0.5,-2.1]},
 tank:{pos:[0,4.7,22],look:[9,8,-13],fov:42,roll:-0.026,drift:[-2,1.3,-4.4]},
 leaks:{pos:[20.5,5.8,-5],look:[15.8,4.5,-12.9],fov:31,roll:0.016,drift:[-1.3,0.4,-1.2]},
 paint:{pos:[20.5,5.2,-5],look:[15.8,4.5,-12.9],fov:31,roll:0.016,drift:[-1.4,0,-1.7]},
 rupture:{pos:[1.3,4.3,23],look:[8,7,-11],fov:42,roll:0.024,drift:[-1.2,0.5,-5]},
 rush:{pos:[0,3.1,19],look:[0,3.4,-8],fov:48,roll:-0.023,drift:[-1.5,0.6,-3]},
 firehouse:{pos:[-4.2,5.3,16],look:[-13.9,4.3,-9],fov:40,roll:0.045,drift:[0.6,-0.5,-4]},
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

