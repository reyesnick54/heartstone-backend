export interface Phase7FixtureContext {
  caseId: string;
  masterFileId: string;
  masterFileNumber: string;
  applicantIdentityId: string;
  applicantSessionToken: string;
  officialIdentityId: string;
  officialSessionToken: string;
  officialOfficeholderId: string;
  requirementCodes: string[];
  governmentServiceVersionId: string;
  departmentId: string;
}

export interface MasterFileCompletenessBody {
  masterAdministrativeFileId: string;
  outcome: 'COMPLETE' | 'INCOMPLETE' | 'UNRESOLVED' | 'SAFE_HALTED';
  requiredEvidenceCount: number;
  satisfiedEvidenceCount: number;
  disputedEvidenceCount: number;
  unresolvedEvidenceCount: number;
  integrityFailureCount: number;
  explanationCodes: string[];
}

export function asCompletenessBody(body: unknown): MasterFileCompletenessBody {
  return body as MasterFileCompletenessBody;
}
