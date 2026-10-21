import { z } from 'zod';

const latLngSchema = z.object({ latitude: z.number(), longitude: z.number() });

/** A resolved location the user can pick as pickup or destination. */
export const placeSchema = z.object({
  /** Google place id, when known (autocomplete / reverse geocode). */
  placeId: z.string().nullable(),
  /** Short line, e.g. "28 May St 12". */
  title: z.string(),
  /** Secondary line, e.g. "Baku". May be empty. */
  subtitle: z.string(),
  location: latLngSchema,
});

export type Place = z.infer<typeof placeSchema>;

/** One autocomplete suggestion (not yet resolved to coordinates). */
export interface PlaceSuggestion {
  placeId: string;
  title: string;
  subtitle: string;
}
