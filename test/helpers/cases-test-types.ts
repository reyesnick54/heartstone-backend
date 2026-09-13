export interface CaseBody {
  id: string;
  caseNumber: string;
  applicationId: string;
  applicationSubmissionId: string;
  governmentServiceId: string;
  governmentServiceVersionId: string;
  responsibleInstitutionId: string;
  responsibleDepartmentId: string;
  caseStatus: string;
  legalStatus: string;
  priority: string;
  openedAt: string;
  closedAt?: string | null;
  currentCaseManagerOfficeholderId?: string | null;
  currentAssignedOfficeId?: string | null;
  applicantIdentityId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CaseStatusHistoryBody {
  id: string;
  caseId: string;
  previousStatus?: string | null;
  newStatus: string;
  previousLegalStatus?: string | null;
  newLegalStatus: string;
  actorIdentityId: string;
  officeholderId?: string | null;
  reason?: string | null;
  correlationId?: string | null;
  createdAt: string;
}

export function asCaseBody(body: unknown): CaseBody {
  return body as CaseBody;
}

export function asCaseStatusHistoryBody(body: unknown): CaseStatusHistoryBody {
  return body as CaseStatusHistoryBody;
}
