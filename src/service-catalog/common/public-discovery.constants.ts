import {
  GovernmentServiceMaturityStatus,
  GovernmentServicePublicAvailability,
} from '@prisma/client';

export const PUBLIC_SERVICE_CACHE_PREFIX = 'public:services';

export const PUBLICLY_PRESENTABLE_AVAILABILITY: GovernmentServicePublicAvailability[] = [
  GovernmentServicePublicAvailability.ACTIVE,
  GovernmentServicePublicAvailability.PILOT_ONLY,
  GovernmentServicePublicAvailability.INFORMATION_ONLY,
];

export const APPLICATION_STARTABLE_AVAILABILITY: GovernmentServicePublicAvailability[] = [
  GovernmentServicePublicAvailability.ACTIVE,
  GovernmentServicePublicAvailability.PILOT_ONLY,
];

export const PUBLIC_SERVICE_LIST_CACHE_TTL_SECONDS = 300;

export const PUBLIC_NONBINDING_DISCLAIMER =
  'This guidance is informational only and does not constitute an official eligibility determination or government decision.';

export const PUBLIC_START_PACKAGE_DISCLAIMER =
  'This start package reflects the current published configuration. Submission and case creation begin in a later phase.';

export const PUBLIC_PRESENTATION_MATURITY = GovernmentServiceMaturityStatus.ACTIVE;
