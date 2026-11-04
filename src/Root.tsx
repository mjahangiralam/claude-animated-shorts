import React from 'react';
import {Composition} from 'remotion';
import {BostonMolasses3D} from './videos/boston3d/Boston';
import {BostonMolasses as BostonMolasses2DPilot} from './videos/BostonMolasses';

export const RemotionRoot:React.FC=()=>(
  <>
    <Composition id="BostonMolasses" component={BostonMolasses3D}
      durationInFrames={1800} fps={30} width={1080} height={1920}/>
    <Composition id="BostonMolasses2DPilot" component={BostonMolasses2DPilot}
      durationInFrames={1800} fps={30} width={1080} height={1920}/>
  </>
);
