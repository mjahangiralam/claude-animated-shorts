import test from 'node:test';
import assert from 'node:assert/strict';
import {FPS,TOTAL,SHOTS,shotAt,floodFrontAt,cameraAt} from '../src/videos/boston3d/timeline.mjs';
import * as physics from '../src/videos/boston3d/timeline.mjs';

test('all 60 seconds are covered by one contiguous shot each', () => {
  assert.equal(FPS,30);
  assert.equal(TOTAL,1800);
  assert.equal(SHOTS[0].a,0);
  assert.equal(SHOTS.at(-1).b,TOTAL);
  for(let i=1;i<SHOTS.length;i++) assert.equal(SHOTS[i-1].b,SHOTS[i].a);
  for(let f=0;f<TOTAL;f++) {
    const shot=shotAt(f);
    assert.ok(shot && shot.a <= f && f < shot.b, 'missing shot at frame '+f);
  }
});

test('the opening gets a flood, the ending gets a blueprint', () => {
  assert.equal(shotAt(0).id,'hook');
  assert.equal(shotAt(1799).id,'blueprint');
});

test('the flood front advances toward the camera after the rupture', () => {
  assert.ok(floodFrontAt(770) < floodFrontAt(890));
  assert.ok(floodFrontAt(890) < floodFrontAt(980));
});

test('all camera values stay finite across scene boundaries', () => {
  for(let f=0;f<TOTAL;f+=7) {
    const c=cameraAt(f);
    for(const v of [...c.pos,...c.look,c.fov,c.roll]) assert.ok(Number.isFinite(v),'non-finite camera at '+f);
    assert.ok(c.fov>15 && c.fov<75);
  }
});

test('the tank release converts pressure head to speed, damped for viscous molasses',()=>{
  assert.equal(physics.pressureHeadSpeedAt(0),0);
  const low=physics.pressureHeadSpeedAt(3),high=physics.pressureHeadSpeedAt(12);
  assert.ok(low>0 && high>low,'greater hydrostatic head must accelerate the jet');
  assert.ok(Math.abs(high/low-2)<1e-8,'pressure head speed must follow sqrt(2gh)');
  assert.ok(high<Math.sqrt(2*9.81*12),'viscous discharge should be slower than ideal water');
});

test('surge accelerates after rupture then loses speed to viscous drag',()=>{
  assert.equal(physics.surgeSpeedAt(687),0);
  assert.equal(physics.surgeDistanceAt(688),0);
  assert.equal(floodFrontAt(687),-35,'street wave appears before the tank bursts');
  assert.ok(physics.surgeSpeedAt(718)>physics.surgeSpeedAt(694),'pressurized release does not accelerate');
  assert.ok(physics.surgeSpeedAt(800)<physics.surgeSpeedAt(718),'surge does not slow under drag');
  for(let f=695;f<=970;f+=7){
    assert.ok(physics.surgeDistanceAt(f)>physics.surgeDistanceAt(f-1),'surge has stopped or reversed');
    assert.ok(physics.surgeSpeedAt(f)>=0,'negative speed');
  }
  const front=floodFrontAt(910);
  assert.ok(front>12 && front<24,'pressure model must keep the rush shot readable');
});

test('pressure-release droplets follow damped horizontal travel and gravity',()=>{
  const a=physics.jetParticleAt(0,10,5,4);
  const b=physics.jetParticleAt(.6,10,5,4);
  const c=physics.jetParticleAt(2.4,10,5,4);
  assert.equal(a.forward,0);
  assert.ok(b.forward>0 && c.forward>b.forward,'droplets fail to travel outward');
  assert.ok(b.height>0,'jet hits ground instantaneously');
  assert.equal(c.height,0,'gravity never returns the droplet to the street');
});

test('the post-rupture surge emerges from the tank breach, not the distant street',()=>{
  const first=floodFrontAt(688);
  assert.ok(first>-14&&first<-9,'surge must start beside the tank at z ≈ -12; got '+first);
  const later=floodFrontAt(910);
  assert.ok(later>12&&later<24,'advancing wave must remain visible from the rush camera');
});

test('the rupture starts on the tank side, then spreads across the whole street',()=>{
  assert.equal(typeof physics.floodSpreadAt,'function','missing source-centered lateral spread');
  const initial=physics.floodSpreadAt(688);
  const emerging=physics.floodSpreadAt(720);
  const downstream=physics.floodSpreadAt(870);
  assert.ok(initial.left>5 && initial.right>7,
    'initial syrup already covers the entire street instead of emerging at x≈7.3');
  assert.ok(emerging.left<initial.left && emerging.left>0,
    'the surge does not fan out from the right-side tank');
  assert.ok(downstream.left<-6.5 && downstream.right>6.5,
    'the wave never spans the street after travelling away from the tank');
  assert.ok(initial.trail<downstream.trail,
    'a full-length flood sheet appears instantaneously at rupture');
});

test('tank steel fragments obey gravity, hit the street, and stop travelling',()=>{
  assert.equal(typeof physics.fragmentFlightAt,'function','missing deterministic falling debris');
  for(let i=0;i<14;i++){
    const launched=physics.fragmentFlightAt(704,i);
    const landed=physics.fragmentFlightAt(860,i);
    const later=physics.fragmentFlightAt(1000,i);
    assert.ok(launched.y>0.3,'metal fragment starts underground');
    assert.ok(landed.landed,'metal fragment '+i+' keeps hovering after six seconds');
    assert.ok(landed.y>=0.25 && landed.y<0.65,'fragment landed off the street surface');
    assert.ok(Math.abs(later.x-landed.x)<0.001 && Math.abs(later.z-landed.z)<0.001,
      'landed metal slides indefinitely');
    assert.equal(later.y,landed.y,'landed metal sinks or bounces forever');
  }
});

test('viscous liquid stays attached to the tank rupture before reaching the street',()=>{
  assert.equal(typeof physics.outflowSheetPointAt,'function','missing tank-to-street liquid connection');
  const start=physics.outflowSheetPointAt(740,0);
  const end=physics.outflowSheetPointAt(740,1);
  assert.ok(Math.abs(start.x-7.3)<0.15 && Math.abs(start.z+12)<0.15,
    'outflow does not start at the tank wall');
  assert.ok(start.y>3.5,'molasses does not leave an elevated breach');
  assert.ok(end.y<0.5 && end.z>-9,'molasses does not descend to the street');
  const newborn=physics.outflowSheetPointAt(688,1);
  assert.ok(Math.hypot(newborn.x-start.x,newborn.z-start.z)<0.2,
    'the whole liquid ribbon appears fully extended at the burst frame');
});

test('the spoon geometry has a recessed bowl instead of a flat convex disc',()=>{
  assert.equal(typeof physics.spoonBowlHeightAt,'function','missing concave bowl profile');
  const middle=physics.spoonBowlHeightAt(0);
  const inner=physics.spoonBowlHeightAt(0.6);
  const edge=physics.spoonBowlHeightAt(1);
  assert.ok(middle<inner && inner<edge,'the bowl does not curve upward to its rim');
  assert.ok(edge-middle>0.25,'the metal spoon is almost flat');
});

test('the rupture shot frames the broken lower tank rather than only flying panels',()=>{
  const cam=physics.cameraAt(735);
  assert.ok(cam.look[1]<5.5,'camera aims above the surviving tank wall');
  assert.ok(Math.hypot(cam.look[0]-7.3,cam.look[2]+12)<3.5,
    'camera is not looking near the actual breach');
});

test('wave face curls forward near the crest and rejoins the surface',()=>{
  assert.equal(typeof physics.waveFoldAt,'function','missing animated breaking-crest profile');
  const low=physics.waveFoldAt(820,1,.3);
  const upper=physics.waveFoldAt(820,1,.72);
  const start=physics.waveFoldAt(820,1,0);
  const end=physics.waveFoldAt(820,1,1);
  assert.ok(upper.forward>low.forward+.4,'lip does not turn over near the top');
  assert.ok(upper.sag>.1,'liquid crest has no downward folding curl');
  assert.ok(Math.abs(start.forward)<.00001&&Math.abs(end.forward)<.00001,
    'breaking face does not connect to the road and top sheet');
});
