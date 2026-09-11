import { type AuthorityActionType, type ProfessionalAttestationSource } from '@prisma/client';

export interface AuthorityEvaluationRequest {
  identityId: string;
  functionAuthorityRecordId: string;
  action: AuthorityActionType;
  officeholderId?: string;
  officeId?: string;
  appointmentId?: string;
  delegationId?: string;
  evidenceProvided?: string[];
  qualificationCodes?: string[];
  transactionAmount?: number;
  scopeValue?: string;
  hasSecondApproval?: boolean;
  hasConsultation?: boolean;
  hasSupervision?: boolean;
  hasLiaison?: boolean;
  isSelfApproval?: boolean;
  isConflicted?: boolean;
  isRecused?: boolean;
  priorActions?: AuthorityActionType[];
  externalDataAccessOnly?: boolean;
  attestationSource?: ProfessionalAttestationSource;
  at?: Date;
}
