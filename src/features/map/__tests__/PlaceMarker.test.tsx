import { screen } from '@testing-library/react-native';
import { StyleSheet, type ViewStyle } from 'react-native';

import { PlaceMarker } from '@/features/map/components/PlaceMarker';
import { correctedOffset } from '@/features/map/hooks/useMarkerCentering';
import { renderWithTheme } from '@/test-utils/renderWithTheme';

// No native maps under Jest: a Marker is a plain View around its children here.
jest.mock('react-native-maps', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { Marker: View };
});

const POINT = { latitude: 40.4, longitude: 49.85 };

describe('correctedOffset (Apple Maps self-centring)', () => {
  // The screenshot case: a 260×212 marker drawn ~40 pt right and ~77 pt below its point.
  const view = { x: 100 + 40 - 130, y: 300 + 77 - 106, width: 260, height: 212 };
  const point = { x: 100, y: 300 };

  it('moves the marker by the measured error', () => {
    expect(correctedOffset({ x: 0, y: 0 }, view, point)).toEqual({ x: -40, y: -77 });
  });

  it('adds to the offset already applied (the next check measures the rest)', () => {
    const nearly = { ...view, x: view.x - 38, y: view.y - 70 };
    expect(correctedOffset({ x: -38, y: -70 }, nearly, point)).toEqual({ x: -40, y: -77 });
  });

  it('leaves a centred marker alone (no endless nudging)', () => {
    const centred = { x: 100 - 130, y: 300 - 106, width: 260, height: 212 };
    expect(correctedOffset({ x: -40, y: -77 }, centred, { x: 100.4, y: 299.7 })).toBeNull();
  });
});

describe('PlaceMarker', () => {
  it('draws the time bubble in the same marker, centred on the dot', async () => {
    await renderWithTheme(
      <PlaceMarker
        coordinate={POINT}
        kind="destination"
        label={{ title: '10 min', subtitle: 'Arrive at 15:01' }}
        testID="marker"
      />,
    );
    expect(screen.getByText('10 min')).toBeTruthy();
    expect(screen.getByText('Arrive at 15:01')).toBeTruthy();

    // Column: bubble area, dot, mirror. Equal outer heights = the dot is the view's centre,
    // which is what the map puts on the point.
    const column = screen.getByText('10 min').parent?.parent?.parent?.parent?.parent;
    const [above, , below] = column?.children ?? [];
    const height = (node: typeof above) =>
      typeof node === 'object' && node !== null && 'props' in node
        ? (StyleSheet.flatten(node.props.style as ViewStyle) ?? {}).height
        : undefined;
    expect(height(above)).toBeGreaterThan(0);
    expect(height(above)).toBe(height(below));
  });

  it('is just the dot without a label', async () => {
    await renderWithTheme(<PlaceMarker coordinate={POINT} kind="pickup" />);
    expect(screen.queryByText(/min/)).toBeNull();
  });
});
