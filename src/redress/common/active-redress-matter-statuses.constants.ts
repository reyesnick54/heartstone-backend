import { RedressMatterStatus } from '@prisma/client';

/** Redress matters still in progress (not closed, withdrawn, or fully implemented). */
export const ACTIVE_REDRESS_MATTER_STATUSES: readonly RedressMatterStatus[] = [
  RedressMatterStatus.FILED,
  RedressMatterStatus.UNDER_REVIEW,
  RedressMatterStatus.INTERIM_RELIEF_PENDING,
  RedressMatterStatus.DECISION_PENDING,
  RedressMatterStatus.IMPLEMENTATION_PENDING,
  RedressMatterStatus.IMPLEMENTATION_IN_PROGRESS,
] as const;
