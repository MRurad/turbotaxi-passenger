import { screen } from '@testing-library/react-native';

import { PlaceMarker } from '@/features/map/components/PlaceMarker';
import { TimeBubbleMarker } from '@/features/map/components/TimeBubbleMarker';
import { renderWithTheme } from '@/test-utils/renderWithTheme';
import { sizes } from '@/theme';

// No native maps under Jest: a Marker is a plain View around its children here.
jest.mock('react-native-maps', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { Marker: View };
});

const POINT = { latitude: 40.4, longitude: 49.85 };

/** Apple Maps (react-native-maps, new architecture) misplaces custom markers above this. */
const APPLE_SAFE_MARKER = { width: 180, height: 55 };

describe('map markers', () => {
  it('the place marker is just the dot', async () => {
    await renderWithTheme(<PlaceMarker coordinate={POINT} kind="pickup" />);
    expect(screen.queryByText(/./)).toBeNull();
  });

  it('the time bubble shows the duration and the arrival clock', async () => {
    await renderWithTheme(
      <TimeBubbleMarker
        coordinate={POINT}
        title="10 min"
        time="15:01"
        accessibilityLabel="10 min, Arrive at 15:01"
      />,
    );
    expect(screen.getByText('10 min')).toBeTruthy();
    expect(screen.getByText('15:01')).toBeTruthy();
    expect(screen.getByLabelText('10 min, Arrive at 15:01')).toBeTruthy();
  });

  it('keeps the time bubble small enough for Apple Maps to place it correctly', () => {
    expect(sizes.timeBubble.width).toBeLessThanOrEqual(APPLE_SAFE_MARKER.width);
    expect(sizes.timeBubble.height).toBeLessThanOrEqual(APPLE_SAFE_MARKER.height);
  });
});
