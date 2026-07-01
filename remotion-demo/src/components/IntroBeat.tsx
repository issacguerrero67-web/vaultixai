import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONT_FAMILY } from '../theme';

type IntroBeatProps = {
  /** Absolute frame at which the intro beat's own entrance animations begin */
  startFrame?: number;
};

const HEADLINE_DELAY = 8; // frames after startFrame
const HEADLINE_IN = 9; // 0.3s
const CHECK_DELAY = 14; // frames after startFrame
const CHECK_IN = 12; // 0.4s, per brief
const SUB_DELAY = 17; // frames after startFrame (~0.3s after headline entrance begins)
const SUB_IN = 9; // 0.3s

export const IntroBeat: React.FC<IntroBeatProps> = ({ startFrame = 0 }) => {
  const frame = useCurrentFrame();
  const { height, width } = useVideoConfig();
  const isVertical = height > width;
  const local = frame - startFrame;

  const headlineOpacity = interpolate(local, [HEADLINE_DELAY, HEADLINE_DELAY + HEADLINE_IN], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const headlineY = interpolate(local, [HEADLINE_DELAY, HEADLINE_DELAY + HEADLINE_IN], [28, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const checkProgress = interpolate(local, [CHECK_DELAY, CHECK_DELAY + CHECK_IN], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const subOpacity = interpolate(local, [SUB_DELAY, SUB_DELAY + SUB_IN], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const subY = interpolate(local, [SUB_DELAY, SUB_DELAY + SUB_IN], [16, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const headlineSize = isVertical ? 48 : 36;
  const subSize = isVertical ? 26 : 20;
  const checkSize = headlineSize * 0.62;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bg,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: isVertical ? 18 : 14,
      }}
    >
      <div
        style={{
          opacity: headlineOpacity,
          transform: `translateY(${headlineY}px)`,
          display: 'flex',
          alignItems: 'center',
          gap: isVertical ? 14 : 12,
        }}
      >
        <span
          style={{
            fontFamily: FONT_FAMILY,
            fontWeight: 700,
            fontSize: headlineSize,
            color: COLORS.text,
            letterSpacing: '-0.02em',
          }}
        >
          Connect in 5 minutes
        </span>
        <CheckmarkIcon size={checkSize} progress={checkProgress} />
      </div>

      <div
        style={{
          opacity: subOpacity,
          transform: `translateY(${subY}px)`,
          fontFamily: FONT_FAMILY,
          fontWeight: 500,
          fontSize: subSize,
          color: COLORS.muted,
          letterSpacing: '-0.005em',
        }}
      >
        Then Vaultix AI does the rest.
      </div>
    </AbsoluteFill>
  );
};

const CheckmarkIcon: React.FC<{ size: number; progress: number }> = ({ size, progress }) => {
  const dashOffset = interpolate(progress, [0, 1], [1, 0]);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 12.5 L9.5 18 L20 5.5"
        stroke={COLORS.accent}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={dashOffset}
      />
    </svg>
  );
};
