import { type MASTER_FILE_COMPLETENESS_OUTCOMES } from '../evidence-records-schema.constants';

export type MasterFileCompletenessOutcome = (typeof MASTER_FILE_COMPLETENESS_OUTCOMES)[number];

export interface MasterFileCompletenessAssessment {
  masterAdministrativeFileId: string;
  outcome: MasterFileCompletenessOutcome;
  requiredEvidenceCount: number;
  satisfiedEvidenceCount: number;
  disputedEvidenceCount: number;
  unresolvedEvidenceCount: number;
  integrityFailureCount: number;
  explanationCodes: string[];
}

export interface MasterFileCompletenessInput {
  masterAdministrativeFileId: string;
  requiredRequirementCodes: string[];
  evidenceRecords: {
    id: string;
    status: string;
    requirementLinks: { requirementCode: string; satisfied: boolean }[];
  }[];
  integrityEvents: { eventType: string }[];
  safeHalted: boolean;
}
