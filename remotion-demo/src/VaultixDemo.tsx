import React from 'react';
import { AbsoluteFill, staticFile, useCurrentFrame } from 'remotion';
import { FramedImage } from './components/FramedImage';
import { TextOverlay } from './components/TextOverlay';
import { PulsingHighlight } from './components/PulsingHighlight';
import { EndCard } from './components/EndCard';
import { IntroBeat } from './components/IntroBeat';
import { Cursor } from './components/Cursor';
import { sceneOpacity } from './components/sceneOpacity';
import { COLORS } from './theme';
import { interpolate } from 'remotion';

// ── Timeline (fps = 30) ───────────────────────────────────────────────────
// Scene 0:  0    - 75   (0s     - 2.5s)  "Connect in 5 minutes"
// Scene 1:  75   - 195  (2.5s   - 6.5s)  "We scan your entire AWS account"
// Scene 2:  195  - 315  (6.5s   - 10.5s) "And find every dollar being wasted"
// Scene 3:  315  - 450  (10.5s  - 15s)   "With the exact resource and fix"
// Scene 4:  450  - 498  (15s    - 16.6s) "Only pay when you actually save"
// End card: 498  - 555  (crossfade in at 498, held 510-555 = final 1.5s)
const S0 = { start: 0, end: 75 };
const S1 = { start: 75, end: 195 };
const S2 = { start: 195, end: 315 };
const S3 = { start: 315, end: 450 };
const S4 = { start: 450, end: 498 };
const END = { start: 498, end: 555 };

const FADE = 12; // 0.4s @ 30fps

// Note on source files: the screenshots are named by their original capture
// order, but their on-screen content maps onto this creative brief as follows
// (verified by inspecting each PNG directly):
//   03-finding-detail-nat.png -> Dashboard overview (used for Scene 1)
//   01-dashboard.png          -> Reports list w/ "$4,037.6/mo" badge (Scene 2)
//   05-billing-unlocked.png   -> Reports detail, NAT finding $1,247/mo (Scene 3)
//   02-reports-list.png       -> Billing page, Fee paid $0.00 (Scene 4)

export const VaultixDemo: React.FC = () => {
  const frame = useCurrentFrame();

  // Scene 0 is first on the timeline, so it gets a true fade-in from black
  // starting at frame 0 rather than a symmetric crossfade.
  const s0Opacity = interpolate(frame, [0, FADE, S0.end - FADE, S0.end], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const s1Opacity = sceneOpacity(frame, S1.start, S1.end, FADE);
  const s2Opacity = sceneOpacity(frame, S2.start, S2.end, FADE);
  const s3Opacity = sceneOpacity(frame, S3.start, S3.end, FADE);
  const s4Opacity = sceneOpacity(frame, S4.start, S4.end, FADE);
  const endOpacity = sceneOpacity(frame, END.start, END.end, FADE, { noFadeOut: true });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      {/* ── Scene 0 — Intro beat, no screenshot ──────────────────────── */}
      <AbsoluteFill style={{ opacity: s0Opacity }}>
        <IntroBeat startFrame={S0.start} />
      </AbsoluteFill>

      {/* ── Scene 1 — Dashboard overview ─────────────────────────────── */}
      <AbsoluteFill style={{ opacity: s1Opacity }}>
        <FramedImage
          src={staticFile('screenshots/03-finding-detail-nat.png')}
          naturalWidth={2513}
          naturalHeight={1321}
          focalX={0.56}
          focalY={0.27}
          zoomFrom={1.0}
          zoomTo={1.04}
          zoomStartFrame={S1.start}
          zoomEndFrame={S1.end}
        >
          {(_box, toScreen) => (
            <Cursor
              toScreen={toScreen}
              path={[
                { frame: S1.start + 3, fx: -0.15, fy: -0.15 }, // starts off-screen top-left
                { frame: S1.start + 25, fx: 0.5, fy: 0.39 }, // arrives near top of findings area
                { frame: S1.start + 43, fx: 0.5, fy: 0.39 }, // small pause
                { frame: S1.start + 75, fx: 0.5, fy: 0.47 }, // drifts down, "scrolling" through findings
              ]}
            />
          )}
        </FramedImage>
        <TextOverlay text="We scan your entire AWS account" startFrame={S1.start + 10} />
      </AbsoluteFill>

      {/* ── Scene 2 — Reports list, pulsing savings badge ────────────── */}
      <AbsoluteFill style={{ opacity: s2Opacity }}>
        <FramedImage
          src={staticFile('screenshots/01-dashboard.png')}
          naturalWidth={2490}
          naturalHeight={1325}
          focalX={0.64}
          focalY={0.2}
          zoomFrom={1.0}
          zoomTo={1.04}
          zoomStartFrame={S2.start}
          zoomEndFrame={S2.end}
        >
          {(_box, toScreen) => {
            const topLeft = toScreen(0.873, 0.12);
            const bottomRight = toScreen(0.977, 0.14);
            return (
              <>
                <PulsingHighlight
                  x={topLeft.x}
                  y={topLeft.y}
                  width={bottomRight.x - topLeft.x}
                  height={bottomRight.y - topLeft.y}
                  startFrame={S2.start}
                />
                <Cursor
                  toScreen={toScreen}
                  path={[
                    { frame: S2.start + 1, fx: 0.6, fy: 0.05 },
                    { frame: S2.start + 24, fx: 0.925, fy: 0.128 }, // arrives at the badge
                  ]}
                  bounce={[
                    // click bounce timed to land on a pulse peak (peaks every 24f from S2.start)
                    { frame: S2.start + 24, scale: 1.0 },
                    { frame: S2.start + 30, scale: 0.85 },
                    { frame: S2.start + 36, scale: 1.0 },
                  ]}
                />
              </>
            );
          }}
        </FramedImage>
        <TextOverlay text="And find every dollar being wasted" startFrame={S2.start + 4} />
      </AbsoluteFill>

      {/* ── Scene 3 — Finding detail, push in on $1,247/mo NAT Gateway ─ */}
      <AbsoluteFill style={{ opacity: s3Opacity }}>
        <FramedImage
          src={staticFile('screenshots/05-billing-unlocked.png')}
          naturalWidth={2492}
          naturalHeight={1322}
          focalX={0.91}
          focalY={0.634}
          zoomFrom={1.0}
          zoomTo={1.55}
          // Zoom kicks in slightly after scene start so the cursor can arrive
          // at the figure "just before" the push-in begins.
          zoomStartFrame={S3.start + 10}
          zoomEndFrame={S3.end}
          anchorY={0.4}
        >
          {(_box, toScreen) => (
            <Cursor
              toScreen={toScreen}
              path={[
                { frame: S3.start + 1, fx: 0.6, fy: 0.8 },
                { frame: S3.start + 10, fx: 0.91, fy: 0.634 }, // arrives right as the zoom begins
              ]}
            />
          )}
        </FramedImage>
        <TextOverlay text="With the exact resource and fix" startFrame={S3.start + 4} />
      </AbsoluteFill>

      {/* ── Scene 4 — Billing, push toward Fee paid / Audit unlocked ──── */}
      <AbsoluteFill style={{ opacity: s4Opacity }}>
        <FramedImage
          src={staticFile('screenshots/02-reports-list.png')}
          naturalWidth={1171}
          naturalHeight={1321}
          focalX={0.43}
          focalY={0.21}
          zoomFrom={1.0}
          zoomTo={1.35}
          zoomStartFrame={S4.start}
          zoomEndFrame={S4.end}
        >
          {(_box, toScreen) => (
            <Cursor
              toScreen={toScreen}
              path={[
                { frame: S4.start + 1, fx: 0.2, fy: 0.05 },
                { frame: S4.start + 20, fx: 0.499, fy: 0.275 }, // arrives at "Fee paid $0.00"
              ]}
            />
          )}
        </FramedImage>
        <TextOverlay text="Only pay when you actually save" startFrame={S4.start + 4} />
      </AbsoluteFill>

      {/* ── End card ────────────────────────────────────────────────── */}
      <AbsoluteFill style={{ opacity: endOpacity }}>
        <EndCard startFrame={END.start} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
