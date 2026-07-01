import React from 'react';
import { Composition } from 'remotion';
import { VaultixDemo } from './VaultixDemo';

const FPS = 30;
const DURATION_IN_FRAMES = 555; // 18.5s @ 30fps

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="VaultixDemoVertical"
        component={VaultixDemo}
        durationInFrames={DURATION_IN_FRAMES}
        fps={FPS}
        width={1080}
        height={1920}
      />
      <Composition
        id="VaultixDemoHorizontal"
        component={VaultixDemo}
        durationInFrames={DURATION_IN_FRAMES}
        fps={FPS}
        width={1920}
        height={1080}
      />
    </>
  );
};
