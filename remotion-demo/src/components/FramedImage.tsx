import React from 'react';
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { computeCoverBox, mapPointToScreen, CoverBox } from './transformMath';

type FramedImageProps = {
  src: string;
  naturalWidth: number;
  naturalHeight: number;
  focalX: number;
  focalY: number;
  zoomFrom: number;
  zoomTo: number;
  /** Local frame range (relative to the scene, i.e. 0 = scene start) over which the zoom animates */
  zoomStartFrame?: number;
  zoomEndFrame?: number;
  anchorX?: number;
  anchorY?: number;
  children?: (box: CoverBox, toScreen: (fx: number, fy: number) => { x: number; y: number }) => React.ReactNode;
};

export const FramedImage: React.FC<FramedImageProps> = ({
  src,
  naturalWidth,
  naturalHeight,
  focalX,
  focalY,
  zoomFrom,
  zoomTo,
  zoomStartFrame = 0,
  zoomEndFrame,
  anchorX = 0.5,
  anchorY = 0.42,
  children,
}) => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();

  const endFrame = zoomEndFrame ?? durationInFrames;
  const zoom = interpolate(frame, [zoomStartFrame, endFrame], [zoomFrom, zoomTo], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const box = computeCoverBox({
    frameWidth: width,
    frameHeight: height,
    naturalWidth,
    naturalHeight,
    focalX,
    focalY,
    zoom,
    anchorX,
    anchorY,
  });

  const toScreen = (fx: number, fy: number) => mapPointToScreen(box, fx, fy);

  return (
    <AbsoluteFill style={{ overflow: 'hidden', backgroundColor: '#111110' }}>
      <Img
        src={src}
        style={{
          position: 'absolute',
          left: box.left,
          top: box.top,
          width: box.width,
          height: box.height,
        }}
      />
      {children ? children(box, toScreen) : null}
    </AbsoluteFill>
  );
};
