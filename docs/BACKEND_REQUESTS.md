# Backend requests for the passenger app

Send this to the backend developer. Items are ordered by priority. Claude Code appends new items here when it hits a gap.

## Blocking (needed before the ride flow works end to end)

1. **Server → client SignalR events for the passenger** (`/hubs/user`). We have the client→server methods. We also need the method names the server *sends* to the user, plus their payload shapes. Please fill in `docs/REALTIME_CONTRACT.md`. At minimum:
   - driver accepted the ride (rideId, driverId, driver name/phone, vehicle plate/brand/model/color, polylines, ETA)
   - driver arrived at pickup
   - ride started
   - ride finished (final price, discount, promo)
   - ride cancelled by driver / no driver found / timeout
   - driver location update (driverId, lat, lng, heading?)
   - new chat message (`/hubs/chat`)
2. **What string does `SubscribeUser(string)` expect?** The userId as a string? A group name like `user-12`?
3. **`GET /api/rides/{id}`.** Returns full ride state (status, driver, vehicle, pickup/destination, fare, polylines). This lets the app recover state after a restart or reconnect.
4. **`GET /api/rides/active`** (for the current JWT user). Returns the in-progress ride or 204. Without it, a reinstalled or relaunched app can't find an ongoing ride.
5. **List of ride status strings** (e.g., `Searching`, `Accepted`, `Arrived`, `InProgress`, `Completed`, `CancelledByUser`, ...).
6. **VehicleType 0–3 names** (0 = ?, 1 = ?, 2 = ?, 3 = ?). Ideally return them as string enums in Swagger (`JsonStringEnumConverter`), or provide `GET /api/vehicle-types` with name and capacity.
7. **Chat `actorRole` value** for passengers (`"User"`? `"user"`? `"Passenger"`?).

## Security (important before production)

8. Take the user's identity from the **JWT claims**, not from `userId` / `actorId` / `actorRole` in the body or query. Today any logged-in user could cancel another user's ride or read their chat.
9. Lock down `/api/debug/*`, `/api/Users` (list all), `/api/Drivers`, `/api/Vehicles` and `PromoCodes` POST to admin only.
10. Add a Bearer security scheme to Swagger so the generated types and docs show which endpoints need auth.

## Nice to have

11. `POST /api/auth/refresh` (refreshToken → new tokens). The app is ready to use it.
12. `GET /api/users/me`.
13. Add `pickupAddress` / `destinationAddress` text to `CreateRideRequest`. The app already knows the address from Google, so the backend doesn't need to reverse-geocode.
14. Add `promoCode` (or `promoCodeId`) to `CreateRideRequest` so the user's chosen promo applies explicitly.
15. Later: rating and tip after a ride, push device token registration, saved places.

## Added while building the API layer

16. **`PromoDiscountType` 0 / 1 meaning.** Swagger exposes it as a bare int enum. The app assumes `0 = percentage`, `1 = fixed amount` (`src/constants/api.ts`). Please confirm, or return string enums.
17. **Trip history query params are PascalCase** (`PageNumber`, `PageSize`) while every other paged endpoint uses camelCase (`pageNumber`, `pageSize`). ASP.NET binds both case-insensitively, but aligning Swagger would keep the generated types consistent.
18. **Vehicle color as a stable key** (e.g. `white`, `black`, `silver`) in ride-accepted / trip payloads, so the app can translate it instead of showing a raw backend string inside az/ru text.
