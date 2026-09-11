import { type ConflictStatus, type RecusalStatus } from './conflict-recusal-status.enum';
import { type EvidenceRequirementStatus } from './evidence-requirement-status.enum';
import { type GovernmentActionType } from './government-action.enum';
import { type QualificationVerificationStatus } from './qualification-verification-status.enum';

export interface AuthorityActorContext {
  identityId: string;
  officeholderId?: string;
  appointmentId?: string;
  delegationId?: string;
}

export interface EvidenceRequirementFact {
  evidenceId: string;
  status: EvidenceRequirementStatus;
}

export interface QualificationFact {
  qualificationCode: string;
  status: QualificationVerificationStatus;
  verifiedAt?: Date;
  expiresAt?: Date;
}

export interface PriorActionRecord {
  action: GovernmentActionType;
  actorIdentityId: string;
  officeholderId?: string;
  performedAt: Date;
  transactionReference?: string;
}

export interface ConcurrenceStatusFact {
  concurrenceKey: string;
  approvalCount: number;
  approverIdentityIds: string[];
}

export interface ApprovedAttributeFact {
  key: string;
  value: string | boolean | number;
}

/**
 * Typed evaluation input contract.
 * Future phases (Evidence Engine, Case Management) populate this context externally.
 * Phase 4D does not create Case models — only accepts optional references.
 */
export interface AuthorityEvaluationContext {
  actor: AuthorityActorContext;
  functionCode: string;
  requestedAction: GovernmentActionType;
  evaluatedAt: Date;
  caseReference?: string;
  applicationReference?: string;
  evidenceStatuses: EvidenceRequirementFact[];
  qualificationStatuses: QualificationFact[];
  conflictStatus: ConflictStatus;
  recusalStatus: RecusalStatus;
  priorActions: PriorActionRecord[];
  transactionAmount?: number;
  transactionCurrency?: string;
  jurisdictionId?: string;
  subjectMatterCode?: string;
  informationClassification?: string;
  actorClearanceLevel?: string;
  concurrenceStatuses: ConcurrenceStatusFact[];
  activationStatus?: 'PENDING' | 'ACTIVE' | 'SUSPENDED';
  approvedAttributes: ApprovedAttributeFact[];
  secondApprovalIdentityIds?: string[];
}
