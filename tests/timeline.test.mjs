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

test('the cold-open shows the broken tank while the earlier history still shows it intact',()=>{
  const intro=physics.tankStateAt(20),historical=physics.tankStateAt(300);
  const rupture=physics.tankStateAt(750);
  assert.equal(intro.intact,false,'intro shows a complete tank after the flood already erupted');
  assert.equal(intro.remnant,true,'intro has no visibly torn tank shell');
  assert.equal(historical.intact,true,'historical tank shot must precede the disaster');
  assert.equal(rupture.remnant,true,'real rupture must still expose the tank remnant');
});

test('the opening cuts at the moment the molasses fully engulfs the camera',()=>{
  const gap=(frame)=>{
    const cam=physics.cameraAt(frame).pos;
    return physics.waveProfileAt(frame,cam[0]).front-cam[2];
  };
  assert.ok(gap(96)<-3,'the syrup arrives far too early in the introduction');
  assert.ok(gap(108)<-1,'the lens is engulfed long before the scene changes');
  assert.ok(Math.abs(gap(114))<.65,'the leading molasses crest misses the lens at the cut');
  assert.equal(physics.openingLensCoverageAt(108),0,'the lens splashes before the wave arrives');
  assert.ok(physics.openingLensCoverageAt(112)>.3,'lens coverage has not started by the last few frames');
  assert.equal(physics.openingLensCoverageAt(114),1,'opening is not fully brown before the cut');
  assert.equal(physics.openingLensCoverageAt(115),0,'lens covering leaks into the spoon shot');
  const cam=physics.cameraAt(114).pos;
  const trailingEdge=physics.waveProfileAt(114,cam[0]).front-physics.floodSpreadAt(114).trail;
  assert.ok(trailingEdge<cam[2]-20,'the thick syrup wake disappears as the crest reaches the camera');
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
  assert.equal(typeof physics.tankLiquidLevelAt,'function','the broken tank has no defined liquid level');
  const start=physics.outflowSheetPointAt(740,0);
  const mouth=physics.outflowSheetPointAt(740,.2);
  const end=physics.outflowSheetPointAt(740,1);
  assert.ok(Math.hypot(start.x-11,start.z+16)<4.5,
    'the stream begins outside the brown liquid instead of inside the tank');
  assert.ok(start.y<physics.tankLiquidLevelAt(740)-.4,
    'the tank liquid level is below the stream origin');
  assert.ok(Math.abs(mouth.x-7.3)<.15 && Math.abs(mouth.z+12)<.15,
    'the stream does not pass through the visible torn opening');
  assert.ok(mouth.y>3.5,'molasses does not pass through an elevated breach');
  assert.ok(end.y<0.5 && end.z>-9,'molasses does not descend to the street');
  const newborn=physics.outflowSheetPointAt(688,1);
  assert.ok(Math.hypot(newborn.x-mouth.x,newborn.z-mouth.z)<0.2,
    'the whole liquid ribbon appears fully extended at the burst frame');
});

test('newborn molasses stream cannot outrun its own flood crest',()=>{
  for(const frame of [700,708,715,730]){
    const tip=physics.outflowSheetPointAt(frame,1);
    const crest=physics.waveProfileAt(frame,tip.x);
    assert.ok(tip.z<=crest.front+.5,
      `stream tip leads the flood crest by an impossible gap at frame ${frame}`);
  }
});

test('the source remains submerged as the tank drains over the rupture shot',()=>{
  assert.equal(typeof physics.tankLiquidLevelAt,'function');
  const levels=[688,790,880,950,1029,1030].map(f=>physics.tankLiquidLevelAt(f));
  assert.ok(levels[0]>7 && levels[0]<9,'tank does not begin mostly filled');
  assert.ok(levels[1]>4.5&&levels[1]<6.5,'tank has not visibly drained during rupture');
  assert.ok(levels[2]>2&&levels[2]<4,'tank still looks full during the street rush');
  assert.ok(levels[3]<2.5&&levels[4]<.5&&levels[5]<=.25,
    'the tank never reaches a nearly empty state');
  assert.ok(levels.every((h,i)=>i===0||h<=levels[i-1]),'molasses level rises while draining');
  for(const frame of [688,790,880,950,1029]){
    assert.ok(physics.outflowSheetPointAt(frame,0).y<physics.tankLiquidLevelAt(frame),
      'the flow source appears above the remaining syrup surface');
    assert.ok(physics.outflowSheetPointAt(frame,.2).y<=physics.tankLiquidLevelAt(frame),
      'the outlet remains high after the liquid surface has fallen');
  }
});

test('the discharge thins as the source reservoir empties',()=>{
  const diameter=(f)=>physics.outflowCrossSectionAt(f,.5,0).x-
    physics.outflowCrossSectionAt(f,.5,Math.PI).x;
  const strong=diameter(750),late=diameter(940),last=diameter(1029);
  assert.ok(strong>1.3,'the early tank discharge is not a substantial liquid stream');
  assert.ok(late<strong*.75,'the drain flow stays thick when most syrup is gone');
  assert.ok(last<late*.45,'the outlet is still producing a full-width flow when empty');
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

test('steel debris visibly lands within the street rather than vanishing behind buildings',()=>{
  const onRoad=[];
  for(let i=0;i<14;i++){
    const hit=physics.fragmentFlightAt(790,i);
    if(hit.landed && 11+hit.x>-7 && 11+hit.x<7 && -16+hit.z>-10 && -16+hit.z<16)
      onRoad.push(i);
  }
  assert.ok(onRoad.length>=7,'fewer than seven fragments have landed in the visible road by the rush cut');
});

test('tank outflow has a rounded, thick liquid cross-section rather than a flat triangular sheet',()=>{
  assert.equal(typeof physics.outflowCrossSectionAt,'function','missing tubular syrup stream');
  const a=physics.outflowCrossSectionAt(725,.5,0);
  const b=physics.outflowCrossSectionAt(725,.5,Math.PI/2);
  const c=physics.outflowCrossSectionAt(725,.5,Math.PI);
  assert.ok(a.x>c.x+.6,'outflow has no horizontal thickness');
  assert.ok(b.y>a.y+.18,'outflow has no vertical volume');
  assert.ok(Math.abs(a.z-b.z)<.5,'cross-section is scattered rather than a continuous stream');
});

test('molasses visibly stretches off the spoon lip before a drop breaks away',()=>{
  assert.equal(typeof physics.spoonDripAt,'function','missing persistent spoon drip');
  const drip=physics.spoonDripAt(190);
  assert.ok(drip.length>1.2,'the slow drip is too short to read on the spoon frame');
  assert.ok(drip.x>-.9,'drip is hidden beneath the center of the spoon');
  assert.ok(drip.z>-2.5,'drip sits behind the bowl');
  assert.ok(drip.dropY<3.1 && drip.dropY>.2,'droplet is not hanging visibly below the rim');
});

test('the deadly surge breaks into uneven high and low crests rather than a smooth wall',()=>{
  const heights=[-7,-4,-1,2,5,7].map(x=>physics.waveProfileAt(820,x).height);
  assert.ok(Math.max(...heights)-Math.min(...heights)>2,
    'rolling wave remains too uniformly rounded');
});

test('debris exposes a finite impact age for a brief visible landing splash',()=>{
  const landed=physics.fragmentFlightAt(790,0);
  assert.ok(Number.isFinite(landed.impactAge),'missing impact timing');
  assert.ok(landed.impactAge>=0,'street debris is counted as landed before impact');
  assert.ok(physics.fragmentFlightAt(688,0).impactAge<0,'impact begins at the explosion');
});

test('a resident overtaken by the molasses is knocked down and swept under',()=>{
  assert.equal(typeof physics.characterFloodResponseAt,'function');
  const home={x:-2.8,z:-12};
  const before=physics.characterFloodResponseAt(680,2,home);
  const struck=physics.characterFloodResponseAt(790,2,home);
  const submerged=physics.characterFloodResponseAt(850,2,home);
  assert.equal(before.hit,false,'character is struck before the tank bursts');
  assert.equal(struck.hit,true,'resident remains untouched after the wave reaches him');
  assert.ok(struck.fall>.05,'resident stays upright instead of falling');
  assert.ok(struck.sweepZ>0,'resident is not carried down the street');
  assert.equal(submerged.submerged,true,'resident remains visible well after being overtaken');
});

test('a runner ahead of the wave is not hit prematurely',()=>{
  const home={x:-3,z:13};
  for(const frame of [700,760,820,870]){
    const response=physics.characterFloodResponseAt(frame,0,home);
    assert.equal(response.hit,false,`safe runner was hit at frame ${frame}`);
    assert.equal(response.submerged,false);
  }
});

test('a person already behind the flood is not allowed to stand throughout the rush',()=>{
  const home={x:1.4,z:-25};
  const struck=physics.characterFloodResponseAt(800,5,home);
  const later=physics.characterFloodResponseAt(900,5,home);
  assert.equal(struck.hit,true,'resident in flooded area remains unaffected');
  assert.equal(later.submerged,true,'resident in flooded area is still standing late in the rush');
});

test('the opening wave knocks down and sweeps away the foreground resident',()=>{
  const home={x:-3,z:13};
  const before=physics.characterFloodResponseAt(20,0,home);
  const struck=physics.characterFloodResponseAt(78,0,home);
  const gone=physics.characterFloodResponseAt(112,0,home);
  assert.equal(before.hit,false,'opening resident is hit before the wave reaches her');
  assert.equal(struck.hit,true,'opening resident stays upright inside the wave');
  assert.ok(struck.fall>.2,'opening resident does not visibly fall');
  assert.ok(struck.sweepZ>1,'opening resident is not swept down the street');
  assert.equal(gone.submerged,true,'opening resident remains visible long after being struck');
});

test('the cold-open wave does not knock over people still ahead of it',()=>{
  const farAhead={x:0,z:34};
  for(const frame of [5,35,70,90]){
    const response=physics.characterFloodResponseAt(frame,6,farAhead);
    assert.equal(response.hit,false,`far-ahead resident incorrectly hit in opening frame ${frame}`);
  }
});
