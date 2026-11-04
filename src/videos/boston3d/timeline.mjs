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
// Deterministic rigid-steel debris, with a gravity arc and a stable ground contact.
const debrisHash=(n)=>{const v=Math.sin(n*74.17+19.1)*43758.5453;return v-Math.floor(v);};
export const fragmentFlightAt=(frame,index)=>{
  const theta=index*2.3999632297;
  const streetward=index%4!==3;
  const t=Math.max(0,(frame-688-index*.25)/FPS);
  const y0=streetward?3+debrisHash(index*7+1)*3.3:6+debrisHash(index*7+1)*6;
  const vy=streetward?3.6+debrisHash(index*13+2)*2.7:6+debrisHash(index*13+2)*3.5;
  const contactY=.32;
  const landTime=(vy+Math.sqrt(vy*vy+2*GRAVITY_M_S2*(y0-contactY)))/GRAVITY_M_S2;
  const fly=Math.min(t,landTime),u=clamp(fly/landTime);
  const easing=1-Math.pow(1-u,1.55);
  const startX=Math.sin(theta)*5.2,startZ=Math.cos(theta)*5.2;
  const targetX=streetward?-16.5+11*debrisHash(index*13+27):
    Math.sin(theta)*(12+debrisHash(index+31)*5);
  const targetZ=streetward?14+14*debrisHash(index*19+33):
    Math.cos(theta)*(11+debrisHash(index+37)*5);
  return {
    x:startX+(targetX-startX)*easing,
    y:t>=landTime?contactY:y0+vy*t-.5*GRAVITY_M_S2*t*t,
    z:startZ+(targetZ-startZ)*easing,
    rx:fly*(1.2+debrisHash(index*3+5)),
    ry:theta+fly*(.55+debrisHash(index+9)),
    rz:fly*(.9+debrisHash(index+7)),
    impactAge:t-landTime,
    landed:t>=landTime
  };
};
// A visible syrup curtain physically connects the elevated breach to the road.
export const outflowSheetPointAt=(frame,fraction)=>{
  const reach=smooth((frame-688)/(FPS*.85));
  const t=clamp(fraction)*reach;
  return {
    x:TANK_BREACH.x-2.9*t,
    y:.17+4.5*(1-smooth(t))+.11*Math.sin(Math.PI*t)*Math.sin(frame*.16),
    z:TANK_BREACH.z+7.1*t
  };
};
// An oval, rounded cross-section gives the tank discharge actual volume.
export const outflowCrossSectionAt=(frame,fraction,angle)=>{
  const center=outflowSheetPointAt(frame,fraction);
  const radius=(.46+.54*smooth(fraction))*smooth((frame-688)/18);
  return {
    x:center.x+radius*Math.cos(angle),
    y:center.y+radius*.62*Math.sin(angle),
    z:center.z+.13*Math.sin(angle+frame*.15)*Math.sin(Math.PI*clamp(fraction))
  };
};
// Slow, visible string of syrup forming at the near rim of the tilted spoon.
export const spoonDripAt=(frame)=>{
  const phase=((frame-115)%120+120)%120/120;
  const length=.35+2.5*smooth(clamp(phase/.85));
  const topY=3.48;
  return {x:-.62,z:-1.9,topY,length,dropY:Math.max(.20,topY-length-.16)};
};
// Concave inner surface of a real spoon, from center (low) to lip (high).
export const spoonBowlHeightAt=(radius)=>-.09+.33*Math.pow(clamp(radius),2);

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
  const height=Math.max(1.55,1.35+2.35*lateral+
    1.04*Math.sin(x*.83-frame*.073)+.76*Math.sin(x*1.9+frame*.13));
  return {front,height};
};
// The face pushes out most strongly near its upper third, then folds back into
// the surface. This creates an overturning syrup lip, not a semicircular mound.
export const waveFoldAt=(frame,x,fraction)=>{
  const t=clamp(fraction),speed=surgeSpeedAt(frame<115?700+frame:frame);
  const energy=clamp(speed/7.5,.34,1.25);
  const curl=Math.sin(Math.PI*t*t);
  return {
    forward:(1.35+1.1*energy)*curl*(1+.12*Math.sin(x*.87+frame*.052)),
    sag:(.21+.17*energy)*curl*curl
  };
};
const KEYS={
 hook:{pos:[1.2,3.0,21],look:[2,3.2,-6],fov:45,roll:-0.038,drift:[-1,0,-3.7]},
 spoon:{pos:[-.8,8.5,9],look:[-1.8,3.4,-1],fov:38,roll:0.02,drift:[0.3,-0.2,-0.8]},
 tank:{pos:[0,4.7,22],look:[9,8,-13],fov:42,roll:-0.026,drift:[-2,1.3,-4.4]},
 leaks:{pos:[20.5,5.8,-5],look:[15.8,4.5,-12.9],fov:31,roll:0.016,drift:[-1.3,0.4,-1.2]},
 paint:{pos:[20.5,5.2,-5],look:[15.8,4.5,-12.9],fov:31,roll:0.016,drift:[-1.4,0,-1.7]},
 rupture:{pos:[1.3,5.2,23],look:[7.9,4.5,-12],fov:44,roll:0.024,drift:[-1.2,0.2,-5]},
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

