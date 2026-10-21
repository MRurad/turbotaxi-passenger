import type { components } from './generated/schema';

/** Friendly aliases for the passenger-relevant DTOs. Services map these to domain types. */
type Schemas = components['schemas'];

// Auth
export type LoginRequest = Schemas['LoginRequest'];
export type RegisterRequest = Schemas['RegisterRequest'];
export type AuthResponse = Schemas['AuthResponse'];
export type AuthResponseData = Schemas['AuthResponseData'];
export type AuthTokensDto = Schemas['AuthTokensDto'];

// Users
export type UserDto = Schemas['UserDto'];
export type UserListItemDto = Schemas['UserListItemDto'];
export type UserUpdateRequest = Schemas['UserUpdateRequest'];

// Rides
export type VehicleTypeDto = Schemas['VehicleType'];
export type CreateRideRequest = Schemas['CreateRideRequest'];
export type CreateRideResponse = Schemas['CreateRideResponse'];
export type CancelRideByUserRequest = Schemas['CancelRideByUserRequest'];
export type CancelRideResponse = Schemas['CancelRideResponse'];
/** Pushed over SignalR (see src/realtime), listed here because Swagger defines the shapes. */
export type RideAcceptedResponse = Schemas['RideAcceptedResponse'];
export type StartRideResponse = Schemas['StartRideResponse'];
export type RideFinishedResponse = Schemas['RideFinishedResponse'];

// Routes
export type CoordinateDto = Schemas['Coordinate'];
export type RouteEstimateRequest = Schemas['RouteEstimateRequest'];
export type RouteEstimateResponse = Schemas['RouteEstimateResponse'];
export type RouteEstimateData = Schemas['RouteEstimateData'];
export type RoutePriceDto = Schemas['RoutePriceDto'];

// Chat
export type ChatMessageDto = Schemas['ChatMessageDto'];
export type ChatMessageDtoPagedResult = Schemas['ChatMessageDtoPagedResult'];
export type SendChatMessageRequest = Schemas['SendChatMessageRequest'];
export type ChatConversationItemDto = Schemas['ChatConversationItemDto'];
export type ChatConversationItemDtoPagedResult = Schemas['ChatConversationItemDtoPagedResult'];

// Trip history
export type UserTripHistoryItem = Schemas['UserTripHistoryItem'];
export type UserTripHistoryItemPagedResult = Schemas['UserTripHistoryItemPagedResult'];

// Promo codes
export type PromoDiscountTypeDto = Schemas['PromoDiscountType'];
export type UserPromoCodeDto = Schemas['UserPromoCodeDto'];
export type UserPromoCodeDtoPagedResult = Schemas['UserPromoCodeDtoPagedResult'];
export type ApplyPromoCodeRequest = Schemas['ApplyPromoCodeRequest'];
export type ApplyPromoCodeResponse = Schemas['ApplyPromoCodeResponse'];

/** Shape shared by every `*PagedResult` DTO. */
export interface PagedResultDto<T> {
  items?: T[] | null;
  pageNumber?: number;
  pageSize?: number;
  totalCount?: number;
  totalPages?: number;
}

/** Per-call options for GET services; pass TanStack Query's `signal` so cancellation aborts. */
export interface RequestOptions {
  signal?: AbortSignal;
}
