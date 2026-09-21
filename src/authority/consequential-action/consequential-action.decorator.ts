import { SetMetadata } from '@nestjs/common';

import { type ConsequentialActionMetadata } from './consequential-action.types';

export const CONSEQUENTIAL_ACTION_KEY = 'consequential_action';

/**
 * Declares that a route performs a consequential government action requiring
 * authenticated actor context, institutional scope, and authority evaluation.
 *
 * Apply only to routes that affect rights, obligations, official records,
 * licenses, permits, approvals, enforcement, expenditure, or similar outcomes.
 * Do not apply to applicant submission or read-only information access.
 */
export const ConsequentialAction = (metadata: ConsequentialActionMetadata) =>
  SetMetadata(CONSEQUENTIAL_ACTION_KEY, metadata);
