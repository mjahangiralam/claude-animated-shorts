import React from 'react';
import {Composition} from 'remotion';
import {BostonMolasses} from './videos/BostonMolasses';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="BostonMolasses" component={BostonMolasses} durationInFrames={1800} fps={30} width={1080} height={1920} />
  </>
);
