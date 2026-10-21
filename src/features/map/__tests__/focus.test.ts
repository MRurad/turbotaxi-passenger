import { appleFocusShift, FOCUS_TOLERANCE_DEG, focusError } from '@/features/map/focus';

const BAKU = { latitude: 40.4093, longitude: 49.8671 };
const SPAN = 0.012;
// iPhone 15 portrait, booking sheet covering the bottom 400 pt.
const VIEW = { viewWidth: 393, viewHeight: 852 };
const INSETS = { top: 0, right: 0, bottom: 400, left: 0 };

describe('appleFocusShift', () => {
  it('uses the span MapKit really shows on a tall screen (width-limited)', () => {
    const shift = appleFocusShift({ coord: BAKU, ...VIEW, overlayInsets: INSETS, span: SPAN });
    const cosLat = Math.cos((BAKU.latitude * Math.PI) / 180);
    // Width is the limiting side: SPAN of longitude across 393 pt.
    const latDegPerPx = (SPAN / VIEW.viewWidth) * cosLat;
    expect(shift).toBeCloseTo((INSETS.bottom / 2) * latDegPerPx, 10);

    // The old formula assumed latitudeDelta spans the full height — too small a shift,
    // which left the user's location below the pin.
    const naive = (INSETS.bottom / 2 / VIEW.viewHeight) * SPAN;
    expect(shift).toBeGreaterThan(naive);
  });

  it('is zero without overlays or before layout', () => {
    expect(
      appleFocusShift({
        coord: BAKU,
        ...VIEW,
        overlayInsets: { ...INSETS, bottom: 0 },
        span: SPAN,
      }),
    ).toBe(0);
    expect(
      appleFocusShift({
        coord: BAKU,
        viewWidth: 0,
        viewHeight: 0,
        overlayInsets: INSETS,
        span: SPAN,
      }),
    ).toBe(0);
  });

  it('shifts the other way when the top overlay is taller than the bottom one', () => {
    const shift = appleFocusShift({
      coord: BAKU,
      ...VIEW,
      overlayInsets: { top: 300, right: 0, bottom: 100, left: 0 },
      span: SPAN,
    });
    expect(shift).toBeLessThan(0);
  });
});

describe('focusError', () => {
  it('ignores errors within tolerance and reports larger ones', () => {
    const tiny = FOCUS_TOLERANCE_DEG / 2;
    expect(
      focusError(BAKU, { latitude: BAKU.latitude + tiny, longitude: BAKU.longitude }),
    ).toBeNull();

    const off = { latitude: BAKU.latitude - 0.0005, longitude: BAKU.longitude + 0.0001 };
    const error = focusError(BAKU, off);
    expect(error?.latitude).toBeCloseTo(0.0005, 10);
    expect(error?.longitude).toBeCloseTo(-0.0001, 10);
  });
});
