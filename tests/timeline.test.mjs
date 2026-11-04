import test from 'node:test';
import assert from 'node:assert/strict';
import {FPS,TOTAL,SHOTS,shotAt,floodFrontAt,cameraAt} from '../src/videos/boston3d/timeline.mjs';

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
