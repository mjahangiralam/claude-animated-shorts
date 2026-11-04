import React, {useEffect,useMemo} from 'react';
import * as THREE from 'three';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import {EffectComposer} from '@react-three/postprocessing';
import {BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode} from 'postprocessing';
import {World} from './world';
import {InkPass, noInkFallback} from './ink';
import {LensBlur} from './lensblur';
import {GradeEffect, GRADES, GRADE_STRENGTH, gradeFor} from './grade';
import {shotAt} from './timeline.mjs';

const fwd=new THREE.Vector3();
const focus=new THREE.Vector3();

// Uses the painted-3D/ink/depth pipeline from the MIT-licensed bridge template.
// World, characters, tank, spoon, wave and shots are original Boston-specific work.
const Inner: React.FC=()=>{
  const frame=useCurrentFrame();
  const {camera,scene}=useThree();
  const world=useMemo(()=>new World(),[]);
  const fx=useMemo(()=>{
    const bloom=new BloomEffect({
      blendFunction:BlendFunction.ADD,
      intensity:.42,luminanceThreshold:1.05,luminanceSmoothing:.22,
      mipmapBlur:true,levels:5,radius:.55
    });
    return {
      ink:new InkPass(scene,camera as THREE.PerspectiveCamera),
      blur:new LensBlur({maxCoC:24,nearScale:1.2}),
      bloom,
      tone:new ToneMappingEffect({mode:ToneMappingMode.NEUTRAL}),
      grade:new GradeEffect(GRADES.day,GRADE_STRENGTH.day)
    };
  },[scene,camera]);
  useEffect(()=>()=>fx.ink.dispose(),[fx]);
  const post=useMemo(()=>
    <EffectComposer multisampling={4}>
      <primitive object={fx.ink} dispose={null}/>
      <primitive object={fx.blur.pre} dispose={null}/>
      <primitive object={fx.blur.main} dispose={null}/>
      <primitive object={fx.bloom} dispose={null}/>
      <primitive object={fx.tone} dispose={null}/>
      <primitive object={fx.grade} dispose={null}/>
    </EffectComposer>
  ,[fx]);
  const target=world.update(frame,camera as THREE.PerspectiveCamera,scene);
  noInkFallback(world.root);
  const shot=shotAt(frame);
  const close=shot.id==='leaks'||shot.id==='paint'||shot.id==='spoon'||shot.id==='physics';
  const neutral=shot.id==='blueprint';
  const cam=camera as THREE.PerspectiveCamera;
  cam.getWorldDirection(fwd);
  focus.copy(target).sub(cam.position);
  fx.blur.focus=Math.max(.4,focus.dot(fwd));
  fx.blur.cInf=neutral?4:close?13:shot.id==='aftermath'?9:shot.id==='tank'?6:2.5;
  gradeFor(fx.grade,shot.light==='gold'?'golden':'day');
  return <><primitive object={world.root} dispose={null}/>{post}</>;
};

export const BostonMolasses3D:React.FC=()=>{
  const frame=useCurrentFrame();
  // Quick photographic transitions, avoiding static slideshow panels.
  const shot=shotAt(frame);
  const cuts=[115,240,385,540,670,790,1030,1190,1450,1640];
  const cut=cuts.find(v=>Math.abs(v-frame)<3);
  const flash=cut===undefined?0:Math.max(0,(3-Math.abs(frame-cut))/3)*.25;
  const impact=frame>=688&&frame<694?(694-frame)/6*.2:0;
  return <AbsoluteFill style={{background:'#b8d0ec'}}>
    <ThreeCanvas
      width={1080} height={1920} shadows
      gl={{antialias:false,stencil:false,powerPreference:'high-performance'}}
      camera={{fov:40,near:.2,far:800,position:[0,3,27]}}
    ><Inner/></ThreeCanvas>
    {(flash>0||impact>0)&&<AbsoluteFill
      style={{backgroundColor:'#fff4d9',opacity:flash+impact,pointerEvents:'none'}}/>}
    {shot.id==='blueprint'&&<AbsoluteFill style={{
      background:'linear-gradient(135deg,rgba(4,16,33,.2),transparent 58%)',
      pointerEvents:'none'}}/>}
  </AbsoluteFill>;
};
