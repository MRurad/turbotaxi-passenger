import { mapBackendStatus } from '@/constants/rideStatus';

describe('mapBackendStatus', () => {
  it('maps a known status to its phase', () => {
    expect(mapBackendStatus('Accepted')).toBe('driver_assigned');
    // Seen on the hub.
    expect(mapBackendStatus('Searching')).toBe('searching');
    expect(mapBackendStatus('OnWay')).toBe('in_progress');
    expect(mapBackendStatus('Completed')).toBe('completed');
  });

  it('is case- and separator-insensitive', () => {
    expect(mapBackendStatus('IN_PROGRESS')).toBe('in_progress');
    expect(mapBackendStatus('in-progress')).toBe('in_progress');
  });

  it('treats every spelling of a cancellation as cancelled', () => {
    expect(mapBackendStatus('Canceled')).toBe('cancelled');
    expect(mapBackendStatus('DriverCanceled')).toBe('cancelled');
    expect(mapBackendStatus('Ride_Cancelled_By_Driver')).toBe('cancelled');
    expect(mapBackendStatus('CanceledByPassenger')).toBe('cancelled');
  });

  it('never ends a ride on in-between cancel states', () => {
    expect(mapBackendStatus('CancelRequested')).toBe('unknown');
    expect(mapBackendStatus('CancellationPending')).toBe('unknown');
    expect(mapBackendStatus('CancellationFailed')).toBe('unknown');
    expect(mapBackendStatus('NotCancelled')).toBe('unknown');
  });

  it('returns unknown for an unrecognized status', () => {
    expect(mapBackendStatus('Teleported')).toBe('unknown');
  });

  it('returns unknown for null, undefined and empty input', () => {
    expect(mapBackendStatus(null)).toBe('unknown');
    expect(mapBackendStatus(undefined)).toBe('unknown');
    expect(mapBackendStatus('')).toBe('unknown');
  });
});
