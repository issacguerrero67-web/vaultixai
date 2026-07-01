import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONT_FAMILY, TEXT_IN_FRAMES } from '../theme';

type TextOverlayProps = {
  text: string;
  /** Local frame (relative to scene start) at which the entrance animation begins */
  startFrame?: number;
};

export const TextOverlay: React.FC<TextOverlayProps> = ({ text, startFrame = 0 }) => {
  const frame = useCurrentFrame();
  const { height, width } = useVideoConfig();
  const isVertical = height > width;

  const localFrame = frame - startFrame;
  const opacity = interpolate(localFrame, [0, TEXT_IN_FRAMES], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const translateY = interpolate(localFrame, [0, TEXT_IN_FRAMES], [24, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const fontSize = isVertical ? 44 : 32;
  const scrimHeight = isVertical ? '30%' : '34%';
  const paddingBottom = isVertical ? 120 : 72;
  const paddingX = isVertical ? 56 : 96;

  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          top: 'auto',
          height: scrimHeight,
          background:
            'linear-gradient(to top, rgba(17,17,16,0.92) 0%, rgba(17,17,16,0.65) 45%, rgba(17,17,16,0) 100%)',
        }}
      />
      <AbsoluteFill
        style={{
          justifyContent: 'flex-end',
          alignItems: isVertical ? 'center' : 'flex-start',
          paddingLeft: paddingX,
          paddingRight: paddingX,
          paddingBottom,
        }}
      >
        <div
          style={{
            opacity,
            transform: `translateY(${translateY}px)`,
            fontFamily: FONT_FAMILY,
            fontSize,
            fontWeight: 600,
            color: COLORS.text,
            letterSpacing: '-0.01em',
            lineHeight: 1.25,
            textAlign: isVertical ? 'center' : 'left',
            maxWidth: isVertical ? '90%' : '60%',
            textShadow: '0 2px 20px rgba(0,0,0,0.4)',
          }}
        >
          {text}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
