import { PLACES_PROVIDER } from '@/constants/places';
import * as google from '@/lib/google/places';
import * as photon from '@/lib/photon/places';

/** Place search + reverse geocoding from the provider chosen in constants/places.ts. */
const provider = PLACES_PROVIDER === 'google' ? google : photon;

export const { autocomplete, placeDetails, reverseGeocode } = provider;
