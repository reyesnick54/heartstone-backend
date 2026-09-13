import {
  type EvidencePacketPurpose,
  type GovernmentCommunicationCategory,
} from '@prisma/client';
import { type EvidencePacketPurpose, type GovernmentCommunicationCategory } from '@prisma/client';

export interface DecisionRequirementsConfig {
  requiredEvidencePacketPurpose?: EvidencePacketPurpose;
  requiredRequirementCodes?: string[];
  requiresProfessionalReview?: boolean;
  requiredProfessionalReviewTypes?: string[];
  requiresInspection?: boolean;
  requiresGovernmentConsultation?: boolean;
  requiresGovernmentConcurrence?: boolean;
  requiresRetainedNationalDetermination?: boolean;
  requiresDepartmentalReview?: boolean;
  requiredCoApprovers?: number;
  proceduralGates?: string[];
  satisfiedProceduralGates?: string[];
}

export interface DecisionReadinessInput {
  caseId: string;
  decisionTypeVersionId: string;
  proposedDecisionMakerIdentityId: string;
  proposedDecisionMakerOfficeholderId?: string;
  appointmentId?: string;
  delegationId?: string;
  requestedOutcome: string;
  evidencePacketVersionId?: string;
  at?: Date;
  isConflicted?: boolean;
  isRecused?: boolean;
  hasSecondApproval?: boolean;
  priorActions?: string[];
}

export interface DecisionExecutionInput {
  caseId: string;
  decisionTypeVersionId: string;
  decisionReadinessAssessmentId: string;
  evidencePacketVersionId: string;
  decisionMakerIdentityId: string;
  decisionMakerOfficeholderId: string;
  appointmentId: string;
  delegationId?: string;
  matterDecided: string;
  outcome: string;
  explicitIntentConfirmed: boolean;
  at?: Date;
  isConflicted?: boolean;
  isRecused?: boolean;
  hasSecondApproval?: boolean;
  priorActions?: string[];
}

export const CONCURRENCE_CATEGORIES: GovernmentCommunicationCategory[] = ['CONCURRENCE'];
export const CONSULTATION_CATEGORIES: GovernmentCommunicationCategory[] = ['CONSULTATION'];
export const RETAINED_DETERMINATION_CATEGORIES: GovernmentCommunicationCategory[] = [
  'RETAINED_DETERMINATION',
];
