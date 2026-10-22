import { z } from 'zod';

/** Photon GeoJSON (third-party payload: validated, unknown fields ignored). */
const optionalText = z.string().nullish();

export const photonFeatureSchema = z.object({
  geometry: z.object({ coordinates: z.tuple([z.number(), z.number()]) }),
  properties: z.object({
    osm_type: optionalText,
    osm_id: z.number().nullish(),
    name: optionalText,
    housenumber: optionalText,
    street: optionalText,
    district: optionalText,
    locality: optionalText,
    city: optionalText,
    county: optionalText,
    state: optionalText,
  }),
});

export const photonResponseSchema = z.object({ features: z.array(photonFeatureSchema) });

export type PhotonFeature = z.infer<typeof photonFeatureSchema>;
