import { z } from 'zod';

/** Third-party payloads are validated; unknown fields are ignored. */

const textSchema = z.object({ text: z.string() }).partial();

export const autocompleteResponseSchema = z.object({
  suggestions: z
    .array(
      z.object({
        placePrediction: z
          .object({
            placeId: z.string(),
            text: textSchema.optional(),
            structuredFormat: z
              .object({ mainText: textSchema.optional(), secondaryText: textSchema.optional() })
              .optional(),
          })
          .optional(),
      }),
    )
    .optional(),
});

export const placeDetailsSchema = z.object({
  id: z.string(),
  formattedAddress: z.string().optional(),
  location: z.object({ latitude: z.number(), longitude: z.number() }),
});

export const geocodeResponseSchema = z.object({
  status: z.string(),
  results: z
    .array(
      z.object({
        place_id: z.string().optional(),
        formatted_address: z.string(),
        types: z.array(z.string()).optional(),
      }),
    )
    .optional(),
  error_message: z.string().optional(),
});

export type AutocompleteResponse = z.infer<typeof autocompleteResponseSchema>;
export type PlaceDetailsResponse = z.infer<typeof placeDetailsSchema>;
export type GeocodeResponse = z.infer<typeof geocodeResponseSchema>;
