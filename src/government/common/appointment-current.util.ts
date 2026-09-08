import { AppointmentStatus } from '@prisma/client';

export interface AppointmentCurrentFields {
  status: AppointmentStatus;
  effectiveFrom: Date;
  effectiveUntil: Date | null;
}

/**
 * Determines whether an appointment is current at the given instant.
 * Shared across services and structure queries to avoid duplicated logic.
 */
export function isAppointmentCurrent(
  appointment: AppointmentCurrentFields,
  at: Date = new Date(),
): boolean {
  if (appointment.status !== AppointmentStatus.ACTIVE) {
    return false;
  }

  if (appointment.effectiveFrom > at) {
    return false;
  }

  if (appointment.effectiveUntil !== null && appointment.effectiveUntil <= at) {
    return false;
  }

  return true;
}
