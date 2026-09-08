import { AppointmentStatus } from '@prisma/client';

import { isAppointmentCurrent } from './appointment-current.util';

describe('isAppointmentCurrent', () => {
  const now = new Date('2026-06-15T12:00:00.000Z');

  it('returns true for an active appointment within its effective period', () => {
    expect(
      isAppointmentCurrent(
        {
          status: AppointmentStatus.ACTIVE,
          effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
          effectiveUntil: new Date('2026-12-31T23:59:59.999Z'),
        },
        now,
      ),
    ).toBe(true);
  });

  it('returns true when effectiveUntil is null', () => {
    expect(
      isAppointmentCurrent(
        {
          status: AppointmentStatus.ACTIVE,
          effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
          effectiveUntil: null,
        },
        now,
      ),
    ).toBe(true);
  });

  it('returns false when status is not ACTIVE', () => {
    expect(
      isAppointmentCurrent(
        {
          status: AppointmentStatus.ENDED,
          effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
          effectiveUntil: null,
        },
        now,
      ),
    ).toBe(false);
  });

  it('returns false before effectiveFrom', () => {
    expect(
      isAppointmentCurrent(
        {
          status: AppointmentStatus.ACTIVE,
          effectiveFrom: new Date('2026-07-01T00:00:00.000Z'),
          effectiveUntil: null,
        },
        now,
      ),
    ).toBe(false);
  });

  it('returns false on or after effectiveUntil', () => {
    expect(
      isAppointmentCurrent(
        {
          status: AppointmentStatus.ACTIVE,
          effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
          effectiveUntil: new Date('2026-06-15T12:00:00.000Z'),
        },
        now,
      ),
    ).toBe(false);
  });

  it('returns false for suspended, revoked, and pending statuses', () => {
    for (const status of [
      AppointmentStatus.SUSPENDED,
      AppointmentStatus.REVOKED,
      AppointmentStatus.PENDING,
    ]) {
      expect(
        isAppointmentCurrent(
          {
            status,
            effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
            effectiveUntil: null,
          },
          now,
        ),
      ).toBe(false);
    }
  });
});
