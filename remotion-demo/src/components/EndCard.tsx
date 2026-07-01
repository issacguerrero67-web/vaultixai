import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONT_FAMILY } from '../theme';

type EndCardProps = {
  /** Local frame (relative to scene start) at which the entrance animation begins */
  startFrame?: number;
};

export const EndCard: React.FC<EndCardProps> = ({ startFrame = 0 }) => {
  const frame = useCurrentFrame();
  const { height, width } = useVideoConfig();
  const isVertical = height > width;
  const local = Math.max(0, frame - startFrame);

  const opacity = interpolate(local, [0, 18], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const scale = interpolate(local, [0, 18], [0.94, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const dotSize = isVertical ? 120 : 96;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          opacity,
          transform: `scale(${scale})`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: isVertical ? 28 : 22,
        }}
      >
        <div
          style={{
            width: dotSize,
            height: dotSize,
            borderRadius: '50%',
            backgroundColor: COLORS.accent,
            boxShadow: `0 0 40px 8px rgba(59,130,246,0.55), 0 0 90px 20px rgba(59,130,246,0.25)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              fontFamily: FONT_FAMILY,
              fontWeight: 800,
              fontSize: dotSize * 0.52,
              color: COLORS.bg,
              letterSpacing: '-0.02em',
              lineHeight: 1,
              transform: 'translateY(-2px)',
            }}
          >
            V
          </span>
        </div>

        <div
          style={{
            fontFamily: FONT_FAMILY,
            fontWeight: 600,
            fontSize: isVertical ? 40 : 30,
            color: COLORS.text,
            letterSpacing: '-0.01em',
          }}
        >
          vaultixai.app
        </div>
      </div>
    </AbsoluteFill>
  );
};
