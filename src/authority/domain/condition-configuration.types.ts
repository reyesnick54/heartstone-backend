import { type SegregationOfDutiesRuleCode } from '../segregation/segregation-of-duties.rules';
import { type EvidenceRequirementStatus } from './evidence-requirement-status.enum';
import { type QualificationVerificationStatus } from './qualification-verification-status.enum';

export interface RequiredEvidenceConfiguration {
  evidenceId: string;
  requiredStatus: EvidenceRequirementStatus;
}

export interface RequiredQualificationConfiguration {
  qualificationCode: string;
  requiredStatus: QualificationVerificationStatus;
}

export interface RequiredConcurrenceConfiguration {
  concurrenceKey: string;
  minApprovals: number;
}

export interface TransactionLimitConfiguration {
  maxAmount: number;
  currency?: string;
}

export interface JurisdictionLimitConfiguration {
  jurisdictionIds: string[];
}

export interface SubjectMatterLimitConfiguration {
  subjectMatterCodes: string[];
}

export interface InformationClassificationConfiguration {
  requiredClassification: string;
  actorClearanceLevel?: string;
}

export interface ConflictCheckConfiguration {
  blockOnActiveConflict: boolean;
}

export interface RecusalCheckConfiguration {
  blockOnActiveRecusal: boolean;
}

export interface SegregationOfDutiesConfiguration {
  ruleCode: SegregationOfDutiesRuleCode;
}

export interface SecondApprovalConfiguration {
  requiredApproverIdentityIds?: string[];
  requiredRole?: string;
  minApprovals: number;
}

export interface ActivationRequiredConfiguration {
  requiredActivationStatus: 'ACTIVE';
}

export interface OtherStructuredRequirementConfiguration {
  requirementKey: string;
  expectedValue: string | boolean | number;
}

export type AuthorityConditionConfiguration =
  | RequiredEvidenceConfiguration
  | RequiredQualificationConfiguration
  | RequiredConcurrenceConfiguration
  | TransactionLimitConfiguration
  | JurisdictionLimitConfiguration
  | SubjectMatterLimitConfiguration
  | InformationClassificationConfiguration
  | ConflictCheckConfiguration
  | RecusalCheckConfiguration
  | SegregationOfDutiesConfiguration
  | SecondApprovalConfiguration
  | ActivationRequiredConfiguration
  | OtherStructuredRequirementConfiguration;
