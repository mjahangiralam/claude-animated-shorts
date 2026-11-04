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

