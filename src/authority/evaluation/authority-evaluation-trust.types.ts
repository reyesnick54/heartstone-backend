import { type AuthorityActionType } from '@prisma/client';

/**
 * Trust-boundary types for authority evaluation (see docs/architecture/authority-evaluation-trust-boundary.md).
 */

/** Category A — caller may supply these to identify intent and scope. */
export interface AuthorityEvaluationResourceScope {
  caseId?: string;
  evidencePacketVersionId?: string;
  decisionReadinessAssessmentId?: string;
}

/** Category B/D — produced only by AuthorityFactsResolver. */
export interface DerivedAuthorityFacts {
  evidenceProvided: string[];
  qualificationCodes: string[];
  hasSecondApproval: boolean;
  hasConsultation: boolean;
  hasSupervision: boolean;
  hasLiaison: boolean;
  isSelfApproval: boolean;
  isConflicted: boolean;
  isRecused: boolean;
  priorActions: AuthorityActionType[];
}

export interface AuthorityFactsSourceRefs {
  institutionalActIds: string[];
  decisionParticipantIds: string[];
  evidenceRecordIds: string[];
  priorAuthorityEvaluationRecordIds: string[];
  evidencePacketVersionId?: string;
  decisionReadinessAssessmentId?: string;
}

export interface ResolvedAuthorityFacts {
  facts: DerivedAuthorityFacts;
  sourceRefs: AuthorityFactsSourceRefs;
}
