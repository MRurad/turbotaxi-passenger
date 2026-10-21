import { mapBackendStatus } from '@/constants/rideStatus';

describe('mapBackendStatus', () => {
  it('maps a known status to its phase', () => {
    expect(mapBackendStatus('Accepted')).toBe('driver_assigned');
  });

  it('is case- and separator-insensitive', () => {
    expect(mapBackendStatus('IN_PROGRESS')).toBe('in_progress');
    expect(mapBackendStatus('in-progress')).toBe('in_progress');
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
