import { VEHICLE_TYPES, VEHICLES } from '@/constants/vehicles';

describe('VEHICLES', () => {
  it('defines all four backend vehicle types 0–3', () => {
    expect(VEHICLE_TYPES).toEqual([0, 1, 2, 3]);
  });

  it.each(VEHICLE_TYPES)('vehicle type %i has a label key, icon and seats', (type) => {
    const vehicle = VEHICLES[type];
    expect(vehicle.type).toBe(type);
    expect(vehicle.labelKey).toMatch(/^booking\.vehicle\./);
    expect(vehicle.icon).toBeTruthy();
    expect(vehicle.seats).toBeGreaterThan(0);
  });
});
