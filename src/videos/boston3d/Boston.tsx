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
const TITLES:Record<string,{kicker:string;headline:string;detail:string}>={
  spoon:{kicker:'BUT THIS WAS MOLASSES',headline:'THICK. SLOW. STICKY.',detail:'The syrup that barely leaves a spoon.'},
  tank:{kicker:'BOSTON · NORTH END · 1919',headline:'2.3 MILLION GALLONS',detail:'Inside a 50-foot steel storage tank.'},
  leaks:{kicker:'THE WARNING SIGNS',headline:'THE SEAMS LEAKED',detail:'Residents had noticed the syrup escaping.'},
  paint:{kicker:'THE WARNING SIGNS',headline:'PAINTED OVER',detail:'Brown paint disguised the leaking molasses.'},
  rupture:{kicker:'JANUARY 15, 1919',headline:'THE TANK BURSTS',detail:'Metal tears apart in an instant.'},
  rush:{kicker:'IN THE STREETS BELOW',headline:'A DEADLY SURGE',detail:'Molasses and debris sweep through the North End.'},
  firehouse:{kicker:'THE WAVE HITS',headline:'ENGINE 31 FIREHOUSE',detail:'The building shifts off its foundation.'},
  physics:{kicker:'WHY IT WAS SO DANGEROUS',headline:'MILLIONS OF GALLONS',detail:'A viscous liquid, moving with enormous force.'},
  aftermath:{kicker:'THE AFTERMATH',headline:'A CITY IN RUINS',detail:'Rescue and cleanup took extraordinary effort.'},
};

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
  const caption=TITLES[shot.id];
  const intro=shot.id==='hook';
  const outro=shot.id==='blueprint';
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
    {intro&&<AbsoluteFill style={{pointerEvents:'none',background:'linear-gradient(180deg,rgba(13,30,47,.45),transparent 43%)',color:'#fff9ee'}}>
      <div style={{position:'absolute',top:128,left:65,right:50}}>
        <div style={{fontSize:30,letterSpacing:7,fontWeight:700}}>JANUARY 15 · 1919</div>
        <div style={{fontFamily:'Georgia,serif',fontSize:100,fontWeight:900,lineHeight:1.03,marginTop:28,textShadow:'0 4px 18px rgba(9,19,30,.45)'}}>
          THE GREAT<br/>MOLASSES<br/>FLOOD
        </div>
        <div style={{height:7,width:172,background:'#f2bb6b',marginTop:36}}/>
        <div style={{fontSize:34,letterSpacing:1,marginTop:21}}>BOSTON · MASSACHUSETTS</div>
      </div>
    </AbsoluteFill>}
    {caption&&<AbsoluteFill style={{pointerEvents:'none',background:'linear-gradient(0deg,rgba(14,25,35,.72),transparent 34%)',color:'#fff7e9'}}>
      <div style={{position:'absolute',bottom:105,left:63,right:62}}>
        <div style={{color:'#ffcd83',fontSize:27,fontWeight:800,letterSpacing:4,textShadow:'0 2px 8px #15232c'}}>
          {caption.kicker}
        </div>
        <div style={{fontFamily:'Georgia,serif',fontSize:60,lineHeight:1.05,fontWeight:900,marginTop:14,textShadow:'0 3px 12px #13232a'}}>
          {caption.headline}
        </div>
        <div style={{fontSize:31,lineHeight:1.25,marginTop:19,color:'#f5e6d3',textShadow:'0 2px 8px #13232a'}}>
          {caption.detail}
        </div>
      </div>
    </AbsoluteFill>}
    {outro&&<AbsoluteFill style={{pointerEvents:'none',background:'linear-gradient(0deg,rgba(8,21,39,.96),rgba(8,21,39,.35) 72%,transparent)',color:'#f7f1df'}}>
      <div style={{position:'absolute',left:70,right:70,bottom:135}}>
        <div style={{fontSize:28,letterSpacing:5,color:'#f1b772',fontWeight:800}}>THE HUMAN COST</div>
        <div style={{fontFamily:'Georgia,serif',fontSize:115,lineHeight:1.0,fontWeight:900,marginTop:18}}>21 LIVES<br/>LOST</div>
        <div style={{fontSize:49,fontWeight:700,marginTop:32}}>150 PEOPLE INJURED</div>
        <div style={{height:5,width:195,background:'#eab470',marginTop:45}}/>
        <div style={{fontSize:36,marginTop:24,lineHeight:1.32}}>A preventable engineering failure.<br/>A tragedy Boston never forgot.</div>
      </div>
    </AbsoluteFill>}
  </AbsoluteFill>;
};

