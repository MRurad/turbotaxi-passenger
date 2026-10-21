import { z } from 'zod';

/**
 * The ONLY place hub paths, hub method names and event names appear (mirrors
 * docs/REALTIME_CONTRACT.md). Server → client names are placeholders until the backend
 * confirms them — unknown events are logged in dev and shown on /dev/realtime.
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

/** Server → client. TODO confirm every name with the backend (docs/BACKEND_REQUESTS.md #1). */
export const USER_HUB_EVENTS = {
  rideAccepted: 'RideAccepted',
  driverArrived: 'DriverArrived',
  rideStarted: 'RideStarted',
  rideFinished: 'RideFinished',
  rideCancelled: 'RideCancelled',
  noDriverFound: 'NoDriverFound',
  driverLocationUpdated: 'DriverLocationUpdated',
} as const;

// ── /hubs/chat ───────────────────────────────────────────────────────────────────────────────

export const CHAT_HUB_METHODS = {
  joinRideChat: 'JoinRideChat',
  leaveRideChat: 'LeaveRideChat',
} as const;

/** TODO confirm with the backend. */
export const CHAT_HUB_EVENTS = {
  receiveMessage: 'ReceiveMessage',
} as const;

// ── Payloads ─────────────────────────────────────────────────────────────────────────────────
// Loose objects: unknown extra fields are kept (useful while the contract is in flux), the
// fields the app relies on are validated. Shapes follow the matching Swagger DTOs.

const id = z.number().int();
const optionalString = z.string().nullish();
const optionalNumber = z.number().nullish();

export const rideAcceptedSchema = z.looseObject({
  rideId: id,
  driverId: id,
  status: optionalString,
  encodedPolyline: optionalString,
  tripEncodedPolyline: optionalString,
  polylinePhase: optionalString,
  distanceKm: optionalNumber,
  durationMinutes: optionalNumber,
  pickupLat: optionalNumber,
  pickupLng: optionalNumber,
  destinationLat: optionalNumber,
  destinationLng: optionalNumber,
  // Driver/vehicle info: not in RideAcceptedResponse yet (docs/BACKEND_REQUESTS.md #1).
  driverName: optionalString,
  driverSurname: optionalString,
  driverPhoneNumber: optionalString,
  vehiclePlateNumber: optionalString,
  vehicleBrand: optionalString,
  vehicleModel: optionalString,
  vehicleColor: optionalString,
});

export const rideRefSchema = z.looseObject({ rideId: id });

export const rideStartedSchema = z.looseObject({
  rideId: id,
  status: optionalString,
  startedAtUtc: optionalString,
});

export const rideFinishedSchema = z.looseObject({
  rideId: id,
  status: optionalString,
  finalPrice: optionalNumber,
  originalFare: optionalNumber,
  discountAmount: optionalNumber,
  promoApplied: z.boolean().nullish(),
  promoCode: optionalString,
  promoRemainingRides: optionalNumber,
  finishedAtUtc: optionalString,
});

export const rideCancelledSchema = z.looseObject({
  rideId: id,
  status: optionalString,
  reason: optionalString,
  /** TODO confirm: who cancelled ("User" / "Driver" / "System"). */
  cancelledBy: optionalString,
});

export const driverLocationSchema = z.looseObject({
  driverId: id,
  latitude: z.number(),
  longitude: z.number(),
  heading: optionalNumber,
});

export const chatMessageSchema = z.looseObject({
  id,
  rideId: id,
  senderRole: optionalString,
  senderId: id.nullish(),
  text: optionalString,
  sentAtUtc: optionalString,
});

export type RideAcceptedEvent = z.infer<typeof rideAcceptedSchema>;
export type RideRefEvent = z.infer<typeof rideRefSchema>;
export type RideStartedEvent = z.infer<typeof rideStartedSchema>;
export type RideFinishedEvent = z.infer<typeof rideFinishedSchema>;
export type RideCancelledEvent = z.infer<typeof rideCancelledSchema>;
export type DriverLocationEvent = z.infer<typeof driverLocationSchema>;
export type ChatMessageEvent = z.infer<typeof chatMessageSchema>;

/** Event name → zod schema of its (first) argument. */
export const USER_HUB_SCHEMAS = {
  [USER_HUB_EVENTS.rideAccepted]: rideAcceptedSchema,
  [USER_HUB_EVENTS.driverArrived]: rideRefSchema,
  [USER_HUB_EVENTS.rideStarted]: rideStartedSchema,
  [USER_HUB_EVENTS.rideFinished]: rideFinishedSchema,
  [USER_HUB_EVENTS.rideCancelled]: rideCancelledSchema,
  [USER_HUB_EVENTS.noDriverFound]: rideRefSchema,
  [USER_HUB_EVENTS.driverLocationUpdated]: driverLocationSchema,
} as const;

export const CHAT_HUB_SCHEMAS = {
  [CHAT_HUB_EVENTS.receiveMessage]: chatMessageSchema,
} as const;

/** Event name → payload type, derived from the schemas so they can never drift. */
export type UserHubEventMap = {
  [K in keyof typeof USER_HUB_SCHEMAS]: z.infer<(typeof USER_HUB_SCHEMAS)[K]>;
};
export type ChatHubEventMap = {
  [K in keyof typeof CHAT_HUB_SCHEMAS]: z.infer<(typeof CHAT_HUB_SCHEMAS)[K]>;
};
