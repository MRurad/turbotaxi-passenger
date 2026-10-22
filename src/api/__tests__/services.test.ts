import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';

import { apiClient } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import { ApiError } from '@/api/errors';
import {
  chatMessageFromEvent,
  currentChatActor,
  getChatConversations,
  getChatMessages,
  sendChatMessage,
} from '@/api/services/chat';
import { applyPromo, getUserPromos } from '@/api/services/promo';
import { cancelRide, createRide } from '@/api/services/rides';
import { estimateRoute } from '@/api/services/routes';
import { getTripHistory } from '@/api/services/tripHistory';
import { deleteCurrentUser, getCurrentUser, updateCurrentUser } from '@/api/services/users';
import { CHAT_ACTOR_ROLE, CHAT_PAGE_SIZE, DEFAULT_PAGE_SIZE } from '@/constants/api';
import { VEHICLE_TYPE } from '@/constants/vehicles';
import { useAuthStore } from '@/features/auth/store';

jest.mock('@/constants/config', () => ({
  config: { API_URL: 'https://api.test', GOOGLE_MAPS_API_KEY: 'test-key' },
}));

const USER_ID = 7;
const BAKU = { latitude: 40.4093, longitude: 49.8671 };
const AIRPORT = { latitude: 40.4675, longitude: 50.0467 };

const initialAuthState = useAuthStore.getState();
const seen: InternalAxiosRequestConfig[] = [];

/** Fake transport: records each request and answers with `status` + `data`. */
function respondWith(status: number, data: unknown = {}): AxiosAdapter {
  return async (config) => {
    seen.push(config);
    const response = { status, statusText: '', data, headers: {}, config };
    if (status >= 400) throw new AxiosError('fail', 'ERR_BAD_RESPONSE', config, {}, response);
    return response;
  };
}

function lastRequest(): InternalAxiosRequestConfig {
  const request = seen.at(-1);
  if (!request) throw new Error('no request was sent');
  return request;
}

function sentBody(): unknown {
  const { data } = lastRequest();
  return typeof data === 'string' ? JSON.parse(data) : data;
}

function signIn(id: number = USER_ID) {
  useAuthStore.setState({
    status: 'authenticated',
    accessToken: 'tok',
    user: { id, name: '', surname: '', phoneNumber: '', email: '', createdAt: null },
  });
}

function signOut() {
  useAuthStore.setState(initialAuthState, true);
}

const SESSION_EXPIRED = expect.objectContaining({ code: 'sessionExpired' });

beforeEach(() => {
  seen.length = 0;
  signOut();
  signIn();
});

describe('rides service', () => {
  const input = { pickup: BAKU, destination: AIRPORT, vehicleType: VEHICLE_TYPE.Comfort };

  it('createRide posts CreateRideRequest with the userId from the auth store', async () => {
    apiClient.defaults.adapter = respondWith(200, {
      rideId: 42,
      status: 'Searching',
      estimatedFare: 8,
    });

    await createRide(input);

    expect(lastRequest()).toMatchObject({ method: 'post', url: ENDPOINTS.rides.create });
    expect(sentBody()).toEqual({
      pickupLat: BAKU.latitude,
      pickupLng: BAKU.longitude,
      destinationLat: AIRPORT.latitude,
      destinationLng: AIRPORT.longitude,
      vehicleType: VEHICLE_TYPE.Comfort,
      userId: USER_ID,
    });
  });

  it('createRide maps the response to a CreatedRide', async () => {
    apiClient.defaults.adapter = respondWith(200, {
      rideId: 42,
      status: 'Searching',
      estimatedFare: 8,
      originalEstimatedFare: 10,
      discountAmount: 2,
      promoApplied: true,
      promoCode: 'WELCOME',
      promoRemainingRides: 1,
      distanceKm: 21.4,
      durationMinutes: 25,
    });

    await expect(createRide(input)).resolves.toEqual({
      rideId: 42,
      status: 'searching',
      rawStatus: 'Searching',
      estimatedFare: 8,
      originalEstimatedFare: 10,
      discountAmount: 2,
      promo: { code: 'WELCOME', remainingRides: 1 },
      distanceKm: 21.4,
      durationMinutes: 25,
    });
  });

  it('createRide rejects with invalidResponse when the response has no fare', async () => {
    apiClient.defaults.adapter = respondWith(200, { rideId: 42, status: 'Searching' });

    await expect(createRide(input)).rejects.toMatchObject({ code: 'invalidResponse' });
  });

  it('createRide turns a { success:false, message } error body into an ApiError', async () => {
    apiClient.defaults.adapter = respondWith(400, {
      success: false,
      message: 'You already have an active ride',
    });

    const error = await createRide(input).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      code: 'badRequest',
      status: 400,
      envelopeMessage: 'You already have an active ride',
    });
  });

  it('createRide fails with sessionExpired and sends nothing when signed out', async () => {
    signOut();
    apiClient.defaults.adapter = respondWith(200, {});

    await expect(createRide(input)).rejects.toEqual(SESSION_EXPIRED);
    expect(seen).toHaveLength(0);
  });

  it('cancelRide posts the store userId to cancel-by-user for that ride', async () => {
    apiClient.defaults.adapter = respondWith(200, { rideId: 42, status: 'CancelledByUser' });

    const result = await cancelRide(42);

    expect(lastRequest()).toMatchObject({ method: 'post', url: '/api/Rides/42/cancel-by-user' });
    expect(sentBody()).toEqual({ userId: USER_ID });
    expect(result).toEqual({ rideId: 42, status: 'cancelled' });
  });

  it('cancelRide falls back to the requested ride id and cancelled for an empty body', async () => {
    apiClient.defaults.adapter = respondWith(200, '');

    await expect(cancelRide(42)).resolves.toEqual({ rideId: 42, status: 'cancelled' });
  });

  it('cancelRide fails with sessionExpired when signed out', async () => {
    signOut();
    apiClient.defaults.adapter = respondWith(200, {});

    await expect(cancelRide(42)).rejects.toEqual(SESSION_EXPIRED);
    expect(seen).toHaveLength(0);
  });
});

describe('routes service', () => {
  const input = {
    origin: BAKU,
    destination: AIRPORT,
    vehicleType: VEHICLE_TYPE.Economy,
    promoCode: ' SALE ',
  };

  it('estimateRoute posts the request with the store userId and a trimmed promo code', async () => {
    apiClient.defaults.adapter = respondWith(200, { success: true, data: { price: { final: 9 } } });

    await estimateRoute(input);

    expect(lastRequest()).toMatchObject({ method: 'post', url: ENDPOINTS.routes.estimate });
    expect(sentBody()).toEqual({
      origin: BAKU,
      destination: AIRPORT,
      vehicleType: VEHICLE_TYPE.Economy,
      promoCode: 'SALE',
      userId: USER_ID,
    });
  });

  it('estimateRoute passes the abort signal through to axios', async () => {
    apiClient.defaults.adapter = respondWith(200, { success: true, data: { price: { final: 9 } } });
    const controller = new AbortController();

    await estimateRoute(input, { signal: controller.signal });

    expect(lastRequest().signal).toBe(controller.signal);
  });

  it('estimateRoute unwraps the envelope and maps the estimate', async () => {
    apiClient.defaults.adapter = respondWith(200, {
      success: true,
      message: null,
      data: {
        distanceKm: 21.4,
        durationMinutes: 25,
        price: { original: 20, discount: 4, final: 16, currency: 'AZN' },
        encodedPolyline: 'abc',
      },
    });

    await expect(estimateRoute(input)).resolves.toEqual({
      distanceKm: 21.4,
      durationMinutes: 25,
      price: { original: 20, discount: 4, final: 16, currency: 'AZN', hasDiscount: true },
      encodedPolyline: 'abc',
    });
  });

  it('estimateRoute rejects an HTTP 200 { success:false, message } with an envelope ApiError', async () => {
    apiClient.defaults.adapter = respondWith(200, {
      success: false,
      message: 'Promo code expired',
    });

    const error = await estimateRoute(input).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      code: 'envelope',
      serverMessage: 'Promo code expired',
      envelopeMessage: 'Promo code expired',
    });
  });

  it('estimateRoute fails with sessionExpired when signed out', async () => {
    signOut();
    apiClient.defaults.adapter = respondWith(200, {});

    await expect(estimateRoute(input)).rejects.toEqual(SESSION_EXPIRED);
    expect(seen).toHaveLength(0);
  });
});

describe('trip history service', () => {
  it('getTripHistory GETs the store user with PascalCase paging params', async () => {
    apiClient.defaults.adapter = respondWith(200, { items: [] });

    await getTripHistory(3);

    expect(lastRequest()).toMatchObject({
      method: 'get',
      url: `/api/TripHistory/user/${USER_ID}`,
      params: { PageNumber: 3, PageSize: DEFAULT_PAGE_SIZE },
    });
  });

  it('getTripHistory requests the first page by default', async () => {
    apiClient.defaults.adapter = respondWith(200, { items: [] });

    await getTripHistory();

    expect(lastRequest().params).toEqual({ PageNumber: 1, PageSize: DEFAULT_PAGE_SIZE });
  });

  it('getTripHistory maps the paged result into trips', async () => {
    apiClient.defaults.adapter = respondWith(200, {
      items: [{ rideId: 5, fare: 12, discountAmount: 2, finalFare: 10, status: 'Completed' }],
      pageNumber: 1,
      pageSize: 20,
      totalCount: 21,
      totalPages: 2,
    });

    const page = await getTripHistory();

    expect(page).toMatchObject({ pageNumber: 1, totalCount: 21, hasNextPage: true });
    expect(page.items).toHaveLength(1);
    expect(page.items[0]).toMatchObject({ rideId: 5, finalFare: 10, status: 'completed' });
  });

  it('getTripHistory returns an empty last page for an empty body', async () => {
    apiClient.defaults.adapter = respondWith(200, '');

    await expect(getTripHistory()).resolves.toMatchObject({ items: [], hasNextPage: false });
  });

  it('getTripHistory rejects when an item has no ride id', async () => {
    apiClient.defaults.adapter = respondWith(200, { items: [{ fare: 3 }] });

    await expect(getTripHistory()).rejects.toMatchObject({ code: 'invalidResponse' });
  });

  it('getTripHistory fails with sessionExpired when signed out', async () => {
    signOut();
    apiClient.defaults.adapter = respondWith(200, { items: [] });

    await expect(getTripHistory()).rejects.toEqual(SESSION_EXPIRED);
    expect(seen).toHaveLength(0);
  });
});

describe('promo service', () => {
  const promoDto = {
    userPromoCodeId: 1,
    promoCodeId: 10,
    code: 'SALE',
    discountType: 0,
    discountValue: 20,
    maxDiscountAmount: 5,
    usedCount: 0,
    isActive: true,
    canUse: true,
  };

  it('getUserPromos GETs the store user with activeOnly and paging params', async () => {
    apiClient.defaults.adapter = respondWith(200, { items: [] });

    await getUserPromos({ activeOnly: true, pageNumber: 2 });

    expect(lastRequest()).toMatchObject({
      method: 'get',
      url: `/api/PromoCodes/user/${USER_ID}`,
      params: { activeOnly: true, pageNumber: 2, pageSize: DEFAULT_PAGE_SIZE },
    });
  });

  it('getUserPromos maps each promo', async () => {
    apiClient.defaults.adapter = respondWith(200, { items: [promoDto], totalPages: 1 });

    const page = await getUserPromos({ activeOnly: false });

    expect(lastRequest().params).toMatchObject({ activeOnly: false, pageNumber: 1 });
    expect(page.items[0]).toMatchObject({
      id: 1,
      promoCodeId: 10,
      code: 'SALE',
      discount: { kind: 'percentage', value: 20, maxAmount: 5 },
      canUse: true,
    });
  });

  it('applyPromo posts userId from the store with the promo and fare', async () => {
    apiClient.defaults.adapter = respondWith(200, {
      promoCodeId: 10,
      originalFare: 12,
      discountAmount: 3,
      finalFare: 9,
    });

    const result = await applyPromo(10, 12);

    expect(lastRequest()).toMatchObject({ method: 'post', url: ENDPOINTS.promo.apply });
    expect(sentBody()).toEqual({ userId: USER_ID, promoCodeId: 10, originalFare: 12 });
    expect(result).toEqual({ promoCodeId: 10, originalFare: 12, discountAmount: 3, finalFare: 9 });
  });

  it('applyPromo surfaces the envelope message of a rejected promo', async () => {
    apiClient.defaults.adapter = respondWith(400, { success: false, message: 'Promo used up' });

    await expect(applyPromo(10, 12)).rejects.toMatchObject({
      code: 'badRequest',
      envelopeMessage: 'Promo used up',
    });
  });

  it('getUserPromos and applyPromo fail with sessionExpired when signed out', async () => {
    signOut();
    apiClient.defaults.adapter = respondWith(200, {});

    await expect(getUserPromos({ activeOnly: true })).rejects.toEqual(SESSION_EXPIRED);
    await expect(applyPromo(10, 12)).rejects.toEqual(SESSION_EXPIRED);
    expect(seen).toHaveLength(0);
  });
});

describe('users service', () => {
  const userDto = {
    id: USER_ID,
    name: ' Rashad ',
    surname: 'Mammadov',
    phoneNumber: '+994501234567',
    email: 'r@x.az',
    createdAt: '2026-01-01T10:00:00',
  };

  it('getCurrentUser GETs the store user and maps it', async () => {
    apiClient.defaults.adapter = respondWith(200, userDto);

    const user = await getCurrentUser();

    expect(lastRequest()).toMatchObject({ method: 'get', url: `/api/Users/${USER_ID}` });
    expect(user).toEqual({
      id: USER_ID,
      name: 'Rashad',
      surname: 'Mammadov',
      phoneNumber: '+994501234567',
      email: 'r@x.az',
      createdAt: '2026-01-01T10:00:00',
    });
  });

  it('getCurrentUser rejects a 404 as notFound', async () => {
    apiClient.defaults.adapter = respondWith(404, { title: 'Not Found' });

    await expect(getCurrentUser()).rejects.toMatchObject({ code: 'notFound', status: 404 });
  });

  it('updateCurrentUser PUTs trimmed fields with the store id', async () => {
    apiClient.defaults.adapter = respondWith(200, userDto);

    await updateCurrentUser({
      name: ' Rashad ',
      surname: ' Mammadov ',
      phoneNumber: ' +994501234567 ',
      email: ' r@x.az ',
    });

    expect(lastRequest()).toMatchObject({ method: 'put', url: ENDPOINTS.users.update });
    expect(sentBody()).toEqual({
      id: USER_ID,
      name: 'Rashad',
      surname: 'Mammadov',
      phoneNumber: '+994501234567',
      email: 'r@x.az',
    });
  });

  it('updateCurrentUser rejects a response without a valid user id', async () => {
    apiClient.defaults.adapter = respondWith(200, { ...userDto, id: 0 });

    await expect(
      updateCurrentUser({ name: 'a', surname: 'b', phoneNumber: '+994', email: 'a@b.az' }),
    ).rejects.toMatchObject({ code: 'invalidResponse' });
  });

  it('deleteCurrentUser DELETEs the store user', async () => {
    apiClient.defaults.adapter = respondWith(204, '');

    await deleteCurrentUser();

    expect(lastRequest()).toMatchObject({ method: 'delete', url: `/api/Users/${USER_ID}` });
  });

  it('user calls fail with sessionExpired when signed out', async () => {
    signOut();
    apiClient.defaults.adapter = respondWith(200, userDto);

    await expect(getCurrentUser()).rejects.toEqual(SESSION_EXPIRED);
    await expect(deleteCurrentUser()).rejects.toEqual(SESSION_EXPIRED);
    expect(seen).toHaveLength(0);
  });
});

describe('chat service', () => {
  const messageDto = {
    id: 1,
    rideId: 42,
    senderRole: 'user',
    senderId: USER_ID,
    text: 'Hi',
    sentAtUtc: '2026-01-01T10:00:00',
  };

  it('currentChatActor is the passenger role with the store user id', () => {
    expect(currentChatActor()).toEqual({ role: CHAT_ACTOR_ROLE, id: USER_ID });
  });

  it('currentChatActor throws sessionExpired when signed out', () => {
    signOut();

    expect(() => currentChatActor()).toThrow(SESSION_EXPIRED);
  });

  it('getChatMessages GETs the ride messages as the store actor with chat paging', async () => {
    apiClient.defaults.adapter = respondWith(200, { items: [] });

    await getChatMessages(42, 2);

    expect(lastRequest()).toMatchObject({
      method: 'get',
      url: '/api/Chat/rides/42/messages',
      params: {
        actorRole: CHAT_ACTOR_ROLE,
        actorId: USER_ID,
        pageNumber: 2,
        pageSize: CHAT_PAGE_SIZE,
      },
    });
  });

  it('getChatMessages marks messages sent by the signed-in user as mine', async () => {
    apiClient.defaults.adapter = respondWith(200, {
      items: [messageDto, { ...messageDto, id: 2, senderRole: 'driver', senderId: 99 }],
    });

    const page = await getChatMessages(42);

    expect(page.items.map((m) => [m.id, m.isMine])).toEqual([
      [1, true],
      [2, false],
    ]);
  });

  it('sendChatMessage posts trimmed text as the store actor and maps the reply', async () => {
    apiClient.defaults.adapter = respondWith(200, { ...messageDto, text: 'On my way' });

    const message = await sendChatMessage(42, '  On my way  ');

    expect(lastRequest()).toMatchObject({ method: 'post', url: '/api/Chat/rides/42/messages' });
    expect(sentBody()).toEqual({ actorRole: CHAT_ACTOR_ROLE, actorId: USER_ID, text: 'On my way' });
    expect(message).toMatchObject({ id: 1, rideId: 42, text: 'On my way', isMine: true });
  });

  it('sendChatMessage rejects a reply without sentAtUtc as invalidResponse', async () => {
    apiClient.defaults.adapter = respondWith(200, { ...messageDto, sentAtUtc: null });

    await expect(sendChatMessage(42, 'Hi')).rejects.toMatchObject({ code: 'invalidResponse' });
  });

  it('getChatConversations GETs conversations with default paging and maps them', async () => {
    apiClient.defaults.adapter = respondWith(200, {
      items: [
        {
          rideId: 42,
          counterpartyRole: 'driver',
          counterpartyId: 99,
          counterpartyDisplayName: ' Elvin ',
          lastMessagePreview: 'Hi',
          lastMessageAtUtc: '2026-01-01T10:00:00',
          lastMessageSenderRole: 'driver',
        },
      ],
    });

    const page = await getChatConversations();

    expect(lastRequest()).toMatchObject({
      method: 'get',
      url: ENDPOINTS.chat.conversations,
      params: {
        actorRole: CHAT_ACTOR_ROLE,
        actorId: USER_ID,
        pageNumber: 1,
        pageSize: DEFAULT_PAGE_SIZE,
      },
    });
    expect(page.items[0]).toEqual({
      rideId: 42,
      counterpartyRole: 'driver',
      counterpartyId: 99,
      counterpartyName: 'Elvin',
      lastMessagePreview: 'Hi',
      lastMessageAt: '2026-01-01T10:00:00',
      lastMessageSenderRole: 'driver',
    });
  });

  it('chat requests fail with sessionExpired and send nothing when signed out', async () => {
    signOut();
    apiClient.defaults.adapter = respondWith(200, { items: [] });

    await expect(getChatMessages(42)).rejects.toEqual(SESSION_EXPIRED);
    await expect(sendChatMessage(42, 'Hi')).rejects.toEqual(SESSION_EXPIRED);
    await expect(getChatConversations()).rejects.toEqual(SESSION_EXPIRED);
    expect(seen).toHaveLength(0);
  });

  it('chatMessageFromEvent maps a hub message and treats a null senderId as not mine', () => {
    const message = chatMessageFromEvent({
      id: 5,
      rideId: 42,
      senderRole: 'user',
      senderId: null,
      text: 'Hi',
      sentAtUtc: '2026-01-01T10:00:00',
    });

    expect(message).toMatchObject({ id: 5, rideId: 42, senderId: 0, isMine: false });
  });

  it('chatMessageFromEvent marks a hub message from the store user as mine', () => {
    const message = chatMessageFromEvent({ ...messageDto, senderRole: 'User' });

    expect(message.isMine).toBe(true);
  });

  it('chatMessageFromEvent throws invalidResponse when the hub message has no timestamp', () => {
    expect(() => chatMessageFromEvent({ ...messageDto, sentAtUtc: null })).toThrow(
      expect.objectContaining({ code: 'invalidResponse' }),
    );
  });
});
