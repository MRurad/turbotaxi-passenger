import { screen } from '@testing-library/react-native';
import { StyleSheet, type ViewStyle } from 'react-native';

import { PlaceMarker } from '@/features/map/components/PlaceMarker';
import { renderWithTheme } from '@/test-utils/renderWithTheme';

// No native maps under Jest: a Marker is a plain View around its children here.
jest.mock('react-native-maps', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { Marker: View };
});

const POINT = { latitude: 40.4, longitude: 49.85 };

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
