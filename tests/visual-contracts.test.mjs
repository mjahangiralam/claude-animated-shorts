import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
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

test('the entire firehouse stays in a wide street-side composition',()=>{
  const cam=timeline.cameraAt(1100);
  assert.ok(Math.hypot(cam.pos[0]+14,cam.pos[2]+9)>20,
    'camera is too close and crops the firehouse facade');
  assert.ok(cam.pos[0]>1,'camera should see the facade from across the street');
});

test('the closeup camera shows the spoon at readable size',()=>{
  const cam=timeline.cameraAt(180);
  assert.ok(cam.pos[2]<11,'spoon camera too far away');
  assert.ok(cam.fov<=39,'spoon camera wide angle hides the bowl detail');
  const down=Math.atan2(cam.pos[1]-cam.look[1],
    Math.hypot(cam.pos[0]-cam.look[0],cam.pos[2]-cam.look[2]));
  assert.ok(down>.4,'spoon camera is too low and shows the horizon instead of the handle');
});

test('ruptured tank retains a broken piece of the lower steel shell',()=>{
  assert.equal(typeof timeline.tankStateAt,'function');
  assert.deepEqual(timeline.tankStateAt(675),{intact:true,remnant:false});
  assert.deepEqual(timeline.tankStateAt(730),{intact:false,remnant:true});
});

test('runners too close to the flood camera are hidden to avoid giant cutouts',()=>{
  assert.equal(typeof timeline.showRushCharacter,'function');
  assert.equal(timeline.showRushCharacter(35,33),false);
  assert.equal(timeline.showRushCharacter(35,15),true);
});

const sceneSource=readFileSync(new URL('../src/videos/boston3d/world.ts',import.meta.url),'utf8');

test('Boston retains the Bridge short painted-lighting pipeline',()=>{
  assert.match(sceneSource,/import \{twoTone, TONE, CHAR, untone\} from/);
  assert.match(sceneSource,/twoTone\(new THREE\.MeshLambertMaterial/);
  assert.match(sceneSource,/TONE\.uShadeCol\.value\.set/);
  assert.match(sceneSource,/TONE\.uSat\.value=/);
});

test('characters and clouds share the Bridge look instead of flat cutouts',()=>{
  assert.match(sceneSource,/cardShade\(new THREE\.MeshLambertMaterial/);
  assert.match(sceneSource,/cloudHD\(i,look\.cloud\)/);
  assert.match(sceneSource,/CHAR\.uCharTint\.value\.set/);
});

test('molasses is a breaking liquid crest with animated droplets',()=>{
  assert.match(sceneSource,/this\.foam\.length/);
  assert.match(sceneSource,/this\.droplets\.length/);
  assert.match(sceneSource,/Burnt-sienna undercut/);
});

const gradeSource=readFileSync(new URL('../src/videos/boston3d/grade.ts',import.meta.url),'utf8');

test('painterly lighting is not double-saturated by the old full-strength film grade',()=>{
  const m=gradeSource.match(/GRADE_STRENGTH[^\n]*=\s*\{\s*day:\s*([\d.]+),\s*golden:\s*([\d.]+)/);
  assert.ok(m,'could not read active day/golden grade amounts');
  assert.ok(+m[1]>=.25 && +m[1]<=.7,'day grade is overpowering the new painted scene');
  assert.ok(+m[2]>=.25 && +m[2]<=.7,'golden grade is overpowering the new painted scene');
  const tone=sceneSource.match(/TONE\.uSat\.value=golden\?([\d.]+):([\d.]+)/);
  assert.ok(tone,'missing world saturation setting');
  assert.ok(+tone[1]<=1.1&&+tone[2]<=1.1,'world color saturation is stacked over full grade');
});
