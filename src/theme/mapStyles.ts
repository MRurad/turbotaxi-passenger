import type { MapStyleElement } from 'react-native-maps';

import { palette } from './palette';
import type { ColorScheme } from './types';

type MapColors = (typeof palette.map)[ColorScheme];

/**
 * Calm, low-noise Google map: business POIs hidden (we show our own pins), roads and water
 * tinted toward the steel-blue brand. Only applied with PROVIDER_GOOGLE.
 */
function buildStyle(c: MapColors): MapStyleElement[] {
  return [
    { elementType: 'geometry', stylers: [{ color: c.land }] },
    { elementType: 'labels.text.fill', stylers: [{ color: c.label }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: c.labelStroke }] },
    { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi.park', stylers: [{ visibility: 'on' }] },
    { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: c.park }] },
    { featureType: 'poi.park', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi.attraction', stylers: [{ visibility: 'on' }] },
    { featureType: 'poi.attraction', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: c.road }] },
    { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: c.arterial }] },
    { featureType: 'road.highway', elementType: 'geometry.fill', stylers: [{ color: c.highway }] },
    {
      featureType: 'road.highway',
      elementType: 'geometry.stroke',
      stylers: [{ color: c.highwayStroke }],
    },
    { featureType: 'transit', elementType: 'geometry', stylers: [{ color: c.transit }] },
    { featureType: 'transit.station', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit.station.rail', stylers: [{ visibility: 'on' }] },
    {
      featureType: 'transit.station.rail',
      elementType: 'labels.icon',
      stylers: [{ visibility: 'on' }],
    },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: c.water }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: c.label }] },
  ];
}

export const mapStyles: Readonly<Record<ColorScheme, MapStyleElement[]>> = {
  light: buildStyle(palette.map.light),
  dark: buildStyle(palette.map.dark),
};
