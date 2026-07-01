import { loadFont } from '@remotion/google-fonts/Inter';

const { fontFamily } = loadFont('normal', { weights: ['600', '700', '800'] });

export const COLORS = {
  bg: '#111110',
  text: '#F5F4F0',
  accent: '#3B82F6',
  muted: '#9ca3af',
} as const;

export const FONT_FAMILY = `'${fontFamily}', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif`;

export const FPS = 30;
export const CROSSFADE_FRAMES = 12; // 0.4s @ 30fps
export const TEXT_IN_FRAMES = 9; // 0.3s @ 30fps
