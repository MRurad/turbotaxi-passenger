import { z } from 'zod';

/**
 * The ONLY place hub paths, hub method names and event names appear (mirrors
 * docs/REALTIME_CONTRACT.md). User-hub events are captured from real traffic; the chat event
 * is still a placeholder. Unknown events are logged in dev and shown on /dev/realtime.
 */

export const HUBS = {
  user: '/hubs/user',
  chat: '/hubs/chat',
} as const;

export type HubName = keyof typeof HUBS;

// ── /hubs/user ───────────────────────────────────────────────────────────────────────────────

/** Client → server (confirmed by the backend). */
export const USER_HUB_METHODS = {
  /** TODO confirm argument (docs/BACKEND_REQUESTS.md #2): userId as a string for now. */
  subscribeUser: 'SubscribeUser',
  unsubscribeUser: 'UnsubscribeUser',
  subscribeDriverLocation: 'SubscribeToDriverLocation',
  unsubscribeDriverLocation: 'UnsubscribeFromDriverLocation',
  ping: 'Ping',
} as const;

/**
 * Server → client, as captured on /dev/realtime (2026-10-22). Every ride change arrives as
 * one RideStatusUpdated with a status string; there are no per-phase events.
 */
export const USER_HUB_EVENTS = {
  rideStatusUpdated: 'RideStatusUpdated',
  driverLocationUpdated: 'DriverLocationUpdated',
} as const;

// ── /hubs/chat ───────────────────────────────────────────────────────────────────────────────

export const CHAT_HUB_METHODS = {
  joinRideChat: 'JoinRideChat',
  leaveRideChat: 'LeaveRideChat',
} as const;

/** Server → client, captured on /dev/realtime (2026-10-22). */
export const CHAT_HUB_EVENTS = {
  receiveMessage: 'ReceiveChatMessage',
} as const;

// ── Payloads ─────────────────────────────────────────────────────────────────────────────────
// Loose objects: unknown extra fields are kept (useful while the contract is in flux), the
// fields the app relies on are validated. Shapes follow the payloads captured on /dev/realtime.

const id = z.number().int();
const optionalString = z.string().nullish();
const optionalNumber = z.number().nullish();

/** Third argument of RideStatusUpdated. Fields depend on the status (see REALTIME_CONTRACT.md). */
const rideUpdatePayloadSchema = z.looseObject({
  rideId: id.nullish(),
  status: z.string(),
  message: optionalString,
  /**
   * On `Searching` this is only the driver the request was OFFERED to — not an assigned
   * driver; don't subscribe to their location until the ride is accepted.
   */
  driverId: id.nullish(),
  distance: optionalNumber,
  driverLat: optionalNumber,
  driverLng: optionalNumber,
  pickupLat: optionalNumber,
  pickupLng: optionalNumber,
  destinationLat: optionalNumber,
  destinationLng: optionalNumber,
  /** The line to draw now: driver → pickup (Approach) or the trip (EnRoute). */
  encodedPolyline: optionalString,
  tripEncodedPolyline: optionalString,
  /** "Approach" | "EnRoute" (null once completed). */
  polylinePhase: optionalString,
  distanceKm: optionalNumber,
  durationMinutes: optionalNumber,
  startedAt: optionalString,
  completedAtUtc: optionalString,
  finalPrice: optionalNumber,
  /** Completed: remove route + car from the map. */
  clearMap: z.boolean().nullish(),
  // Not sent yet (docs/BACKEND_REQUESTS.md #1).
  driverName: optionalString,
  driverSurname: optionalString,
  driverPhoneNumber: optionalString,
  vehiclePlateNumber: optionalString,
  vehicleBrand: optionalString,
  vehicleModel: optionalString,
  vehicleColor: optionalString,
});

/**
 * RideStatusUpdated(rideId: int, type: string, payload). Schemas describe the whole argument
 * list (the server sends positional arguments) and turn it into one object. The first
 * argument is the ride the server routed on; a payload naming another ride is rejected.
 */
export const rideStatusUpdatedSchema = z
  .tuple([id, z.string(), rideUpdatePayloadSchema])
  .rest(z.unknown())
  .refine(([rideId, , payload]) => payload.rideId == null || payload.rideId === rideId, {
    message: 'payload rideId differs from the routed rideId',
  })
  .transform(([rideId, type, payload]) => ({ ...payload, rideId, type }));

/** DriverLocationUpdated(driverId: int, latitude: number, longitude: number). */
export const driverLocationSchema = z
  .tuple([id, z.number(), z.number()])
  .rest(z.unknown())
  .transform(([driverId, latitude, longitude]) => ({ driverId, latitude, longitude }));

const chatMessageObjectSchema = z.looseObject({
  id,
  rideId: id,
  senderRole: optionalString,
  senderId: id.nullish(),
  text: optionalString,
  sentAtUtc: optionalString,
});

/**
 * ReceiveChatMessage(message): { id, rideId, senderRole ("driver" / "user"), senderId, text,
 * sentAtUtc } — captured 2026-10-22.
 */
export const chatMessageSchema = z
  .tuple([chatMessageObjectSchema])
  .rest(z.unknown())
  .transform(([message]) => message);

export type RideStatusUpdatedEvent = z.output<typeof rideStatusUpdatedSchema>;
export type DriverLocationEvent = z.output<typeof driverLocationSchema>;
export type ChatMessageEvent = z.output<typeof chatMessageSchema>;

/** Event name → zod schema of its argument list. */
export const USER_HUB_SCHEMAS = {
  [USER_HUB_EVENTS.rideStatusUpdated]: rideStatusUpdatedSchema,
  [USER_HUB_EVENTS.driverLocationUpdated]: driverLocationSchema,
} as const;

export const CHAT_HUB_SCHEMAS = {
  [CHAT_HUB_EVENTS.receiveMessage]: chatMessageSchema,
} as const;

/** Event name → payload type, derived from the schemas so they can never drift. */
export type UserHubEventMap = {
  [K in keyof typeof USER_HUB_SCHEMAS]: z.output<(typeof USER_HUB_SCHEMAS)[K]>;
};
export type ChatHubEventMap = {
  [K in keyof typeof CHAT_HUB_SCHEMAS]: z.output<(typeof CHAT_HUB_SCHEMAS)[K]>;
};
