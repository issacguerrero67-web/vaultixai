import { interpolate } from 'remotion';

/**
 * Computes a scene's opacity for a manual crossfade across a single
 * continuous timeline (no <Sequence> nesting). `start`/`end` are the scene's
 * nominal on-screen window in absolute frames; the fade-in happens in the
 * `fadeFrames` before `start`, and the fade-out happens in the last
 * `fadeFrames` before `end`.
 */
export function sceneOpacity(
  frame: number,
  start: number,
  end: number,
  fadeFrames: number,
  opts: { noFadeIn?: boolean; noFadeOut?: boolean } = {},
): number {
  const points: number[] = [];
  const values: number[] = [];

  if (opts.noFadeIn) {
    points.push(start);
    values.push(1);
  } else {
    const fadeInStart = Math.max(0, start - fadeFrames);
    points.push(fadeInStart, start);
    values.push(0, 1);
  }

  if (opts.noFadeOut) {
    points.push(end);
    values.push(1);
  } else {
    const fadeOutStart = Math.max(points[points.length - 1] + 0.001, end - fadeFrames);
    points.push(fadeOutStart, end);
    values.push(1, 0);
  }

  return interpolate(frame, points, values, {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}
