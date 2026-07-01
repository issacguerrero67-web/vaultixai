import React from 'react';
import { useCurrentFrame } from 'remotion';
import { COLORS } from '../theme';

type PulsingHighlightProps = {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Local frame (relative to scene start) at which the pulse begins */
  startFrame?: number;
};

/**
 * A soft pulsing ring/glow drawn around a rectangular region (e.g. the
 * "Potential savings" badge), used to draw the eye without obscuring the text.
 */
export const PulsingHighlight: React.FC<PulsingHighlightProps> = ({
  x,
  y,
  width,
  height,
  startFrame = 0,
}) => {
  const frame = useCurrentFrame();
  const local = Math.max(0, frame - startFrame);

  const cycle = (local / 24) * Math.PI * 2; // ~0.8s per pulse @ 30fps
  const pulse = (Math.sin(cycle) + 1) / 2; // 0-1

  const padding = 14 + pulse * 6;
  const glowOpacity = 0.35 + pulse * 0.4;
  const scale = 1 + pulse * 0.03;

  return (
    <div
      style={{
        position: 'absolute',
        left: x - padding,
        top: y - padding,
        width: width + padding * 2,
        height: height + padding * 2,
        borderRadius: (height + padding * 2) / 2,
        border: `2px solid ${COLORS.accent}`,
        boxShadow: `0 0 ${18 + pulse * 18}px ${4 + pulse * 4}px rgba(59,130,246,${glowOpacity})`,
        transform: `scale(${scale})`,
        pointerEvents: 'none',
      }}
    />
  );
};
