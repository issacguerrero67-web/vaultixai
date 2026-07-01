import React from 'react';
import { Easing, interpolate, useCurrentFrame } from 'remotion';

export type CursorKeyframe = { frame: number; fx: number; fy: number };
export type CursorScaleKeyframe = { frame: number; scale: number };

type CursorProps = {
  /** Maps an image-space fraction (0-1) to the current on-screen pixel position. */
  toScreen: (fx: number, fy: number) => { x: number; y: number };
  /** Ordered, strictly-increasing-by-frame waypoints in image-fraction space. */
  path: CursorKeyframe[];
  /** Optional scale keyframes layered on top of the position path (e.g. a click bounce). */
  bounce?: CursorScaleKeyframe[];
  size?: number;
};

const easing = Easing.inOut(Easing.cubic);

/**
 * A simple white arrow cursor with a dark drop shadow, driven by an eased
 * multi-keyframe path defined in the same image-fraction coordinate space
 * used by FramedImage/PulsingHighlight — so it tracks the live Ken Burns
 * zoom/pan exactly like any other overlay anchored to the screenshot.
 */
export const Cursor: React.FC<CursorProps> = ({ toScreen, path, bounce, size = 26 }) => {
  const frame = useCurrentFrame();

  const frames = path.map((p) => p.frame);
  const fxs = path.map((p) => p.fx);
  const fys = path.map((p) => p.fy);

  const fx = interpolate(frame, frames, fxs, {
    easing,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const fy = interpolate(frame, frames, fys, {
    easing,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const { x, y } = toScreen(fx, fy);

  const introOpacity = interpolate(frame, [frames[0], frames[0] + 6], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  let scale = 1;
  if (bounce && bounce.length > 0) {
    const bf = bounce.map((b) => b.frame);
    const bs = bounce.map((b) => b.scale);
    scale = interpolate(frame, bf, bs, {
      easing,
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        opacity: introOpacity,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        pointerEvents: 'none',
        zIndex: 50,
      }}
    >
      <CursorSvg size={size} />
    </div>
  );
};

const CursorSvg: React.FC<{ size: number }> = ({ size }) => (
  <svg
    width={size}
    height={size * 1.25}
    viewBox="0 0 16 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{
      filter:
        'drop-shadow(0 2px 3px rgba(0,0,0,0.55)) drop-shadow(0 0 1.5px rgba(0,0,0,0.9))',
    }}
  >
    <path
      d="M0.5 0.5 L0.5 15.2 L4.6 11.9 L7.1 18.6 L9.5 17.6 L7 10.9 L12.8 10.8 Z"
      fill="white"
      stroke="#111110"
      strokeWidth="1"
      strokeLinejoin="round"
    />
  </svg>
);
