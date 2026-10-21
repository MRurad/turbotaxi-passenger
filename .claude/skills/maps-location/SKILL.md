---
name: maps-location
description: Google Maps with react-native-maps, expo-location permissions, Google Places (New) autocomplete, reverse geocoding, polylines, markers and camera. Use for the home map, address search, route drawing and live driver tracking.
---

# Maps & location

## Config
- Key: `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`, read only through `src/constants/config.ts`.
- `app.config.ts`: set `ios.config.googleMapsApiKey`, `android.config.googleMaps.apiKey`, the expo-location plugin with an az/en permission text, `ios.bundleIdentifier` and `android.package` (`az.turbotaxi.passenger` unless told otherwise).
- Restrict the key in Google Cloud to the iOS bundle ID and the Android package+SHA1. Enable: Maps SDK for iOS, Maps SDK for Android, Places API (New), Geocoding API, Directions API (only if needed).

## Provider
`src/features/map/constants.ts`:
```ts
import Constants, { ExecutionEnvironment } from 'expo-constants';
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
// Google on iOS needs a dev build; Expo Go on iOS falls back to Apple Maps.
export const MAP_PROVIDER = Platform.OS === 'android' || !isExpoGo ? PROVIDER_GOOGLE : PROVIDER_DEFAULT;
export const BAKU_REGION = { latitude: 40.4093, longitude: 49.8671, latitudeDelta: 0.08, longitudeDelta: 0.08 };
```
Use a light and a dark `customMapStyle` JSON in `src/features/map/styles/` (Google only), switched by the theme.

## Components (src/features/map/components)
- `AppMap`: a wrapper around MapView. It takes the provider, the theme style, `showsUserLocation`, and a forwarded ref with `fitToCoordinates(coords, padding)` and `animateTo(coord)` helpers.
- `CenterPin`: a fixed pin overlay for picking pickup by dragging the map. Use `onRegionChangeComplete` with debounce, then reverse-geocode. The pin lifts while dragging (Reanimated).
- `RoutePolyline`: decodes the encoded polyline (`@googlemaps/polyline-codec` in `src/lib/polyline.ts`) and draws it in the theme's primary color with an outline.
- `CarMarker`: an animated marker for the driver. Interpolate between location updates over ~1 s, and rotate by heading or by the bearing computed from the previous point (`src/lib/geo.ts`). Set `tracksViewChanges={false}` after the first render.
- `PlaceMarker` (pickup / destination).

## Location
`src/features/map/hooks/useCurrentLocation.ts`: requests foreground permission and returns `{ status, coords, refresh }`. If permission is denied, show a friendly card with an "Open settings" action (`Linking.openSettings()`) and fall back to `BAKU_REGION`. Don't request background location.

## Google APIs: `src/lib/google/`
- `placesClient.ts`: a separate axios instance (base `https://places.googleapis.com/v1`), with headers `X-Goog-Api-Key` and `X-Goog-FieldMask`. On iOS also send `X-Ios-Bundle-Identifier`, on Android `X-Android-Package` (needed when the key is app-restricted).
- `autocomplete(input, sessionToken, bias)`: `POST /places:autocomplete` with `includedRegionCodes: ['az']`, `languageCode` from i18n, and `locationBias` as a circle around the user.
- `placeDetails(placeId, sessionToken)`: `GET /places/{id}` with field mask `location,formattedAddress,displayName`. Use one session token (uuid) per search session for billing.
- `reverseGeocode(lat, lng)`: Geocoding API `https://maps.googleapis.com/maps/api/geocode/json?latlng=…&language=…`.
- Debounce autocomplete by 300 ms (`useDebouncedValue`), keep at least 2 characters before searching, and cache with TanStack Query.

## Search screen
A full-screen modal with two inputs (pickup and destination). Show the results list with icons, a "Choose on map" row, and recent places (last 10, stored in AsyncStorage via `src/constants/storageKeys.ts`).
