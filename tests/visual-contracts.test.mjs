import test from 'node:test';
import assert from 'node:assert/strict';
import * as timeline from '../src/videos/boston3d/timeline.mjs';

const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);

test('the 1919 tank leak closeup points at the rivets, not an empty wall',()=>{
  const leak=[15.8,4.5,-12.9];
  for(const f of [455,600]){
    const shot=timeline.cameraAt(f);
    assert.ok(distance(shot.look,leak)<2.0,'missed leak at frame '+f);
  }
});

test('the spoon shot centers the syrup bowl in portrait framing',()=>{
  const bowl=[-2.0,3.5,-2.0];
  const shot=timeline.cameraAt(190);
  assert.ok(distance(shot.look,bowl)<1.7,'spoon bowl is outside the focal area');
});

test('the molasses front has an irregular rolling silhouette, not a straight wall',()=>{
  assert.equal(typeof timeline.waveProfileAt,'function');
  const profile=[-6,-3,0,3,6].map(x=>timeline.waveProfileAt(865,x));
  const spans=profile.map(p=>p.front);
  const heights=profile.map(p=>p.height);
  assert.ok(Math.max(...spans)-Math.min(...spans)>.35,'wave lip is straight');
  assert.ok(Math.max(...heights)-Math.min(...heights)>.25,'wave crest is flat');
  for(const p of profile)assert.ok(Number.isFinite(p.front)&&p.height>1.5);
});


test('the deadly surge camera stays ahead of the wave so its approach remains visible',()=>{
  const frame=910;
  const cam=timeline.cameraAt(frame);
  assert.ok(cam.pos[2]-timeline.floodFrontAt(frame)>13,
    'camera has been overtaken by the wave before the action can be seen');
  assert.ok(cam.look[2]>8,'camera is aimed far beyond the approaching wave');
});

test('the firehouse impact camera does not look past intervening buildings',()=>{
  const cam=timeline.cameraAt(1100);
  assert.ok(cam.pos[2]<4,'camera stands behind foreground buildings');
  assert.ok(cam.pos[0]>-7,'camera should be on the street-facing side of the firehouse');
});

test('the closeup camera shows the spoon at readable size',()=>{
  const cam=timeline.cameraAt(180);
  assert.ok(cam.pos[2]<11,'spoon camera too far away');
  assert.ok(cam.fov<=39,'spoon camera wide angle hides the bowl detail');
});

test('ruptured tank retains a broken piece of the lower steel shell',()=>{
  assert.equal(typeof timeline.tankStateAt,'function');
  assert.deepEqual(timeline.tankStateAt(675),{intact:true,remnant:false});
  assert.deepEqual(timeline.tankStateAt(730),{intact:false,remnant:true});
});
