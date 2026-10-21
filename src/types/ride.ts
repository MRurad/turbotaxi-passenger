/** App-side ride lifecycle phase. See .claude/skills/ride-flow/SKILL.md. */
export type RidePhase =
  | 'idle' // home map, nothing booked
  | 'searching' // POST /api/Rides succeeded, waiting for a driver
  | 'driver_assigned' // driver accepted, coming to pickup
  | 'driver_arrived'
  | 'in_progress'
  | 'completed' // show summary, then reset to idle
  | 'cancelled' // by user or driver
  | 'no_driver'; // timeout / nobody accepted

/** The assigned driver as the passenger sees it. Every field may be missing (docs/BACKEND_REQUESTS.md #1). */
export interface RideDriver {
  name: string | null;
  phoneNumber: string | null;
  plateNumber: string | null;
  brand: string | null;
  model: string | null;
  color: string | null;
}
