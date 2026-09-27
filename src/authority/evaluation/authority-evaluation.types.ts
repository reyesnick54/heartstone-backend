import { type AuthorityActionType, type ProfessionalAttestationSource } from '@prisma/client';

import { type AuthorityEvaluationResourceScope } from './authority-evaluation-trust.types';

/**
 * Internal authority evaluation request.
 * Category-A fields may be supplied by HTTP or guards; authority facts are always resolved server-side.
 */
export interface AuthorityEvaluationRequest {
  identityId: string;
  functionAuthorityRecordId: string;
  action: AuthorityActionType;
  officeholderId?: string;
  officeId?: string;
  appointmentId?: string;
  delegationId?: string;
  resourceScope?: AuthorityEvaluationResourceScope;
  transactionAmount?: number;
  scopeValue?: string;
  externalDataAccessOnly?: boolean;
  attestationSource?: ProfessionalAttestationSource;
  /** Audited internal replay only — never set from public HTTP. */
  privilegedHistoricalAt?: Date;
}
