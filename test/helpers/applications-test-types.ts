export interface ApplicationBody {
  id: string;
  applicationNumber: string;
  applicantIdentityId: string;
  representativeAuthorityId?: string | null;
  organizationId?: string | null;
  governmentServiceId: string;
  governmentServiceVersionId: string;
  currentStatus: string;
  submissionChannel: string;
  draftFormVersionId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubmissionAcknowledgmentBody {
  applicationNumber: string;
  submissionId: string;
  receivedAt: string;
  serviceName: string;
  serviceVersionLabel: string;
  formVersionId: string;
  configurationFingerprint: string;
  nextExpectedStage: string;
  currentStatus: string;
  acknowledgmentReference: string;
  receiptDisclaimer: string;
}

export interface ApplicationSubmissionBody {
  id: string;
  applicationId: string;
  submissionSequence: number;
  serviceVersionId: string;
  formVersionId: string;
  configurationFingerprint: string;
  submittedByIdentityId: string;
  submittedCapacity: string;
  representativeAuthorityId?: string | null;
  submissionChannel: string;
  submittedAt: string;
  payloadHash: string;
  acknowledgmentReference: string;
  supersedesSubmissionId?: string | null;
  createdAt: string;
}

export function asApplicationBody(body: unknown): ApplicationBody {
  return body as ApplicationBody;
}

export function asSubmissionAcknowledgmentBody(body: unknown): SubmissionAcknowledgmentBody {
  return body as SubmissionAcknowledgmentBody;
}

export function asApplicationSubmissionBody(body: unknown): ApplicationSubmissionBody {
  return body as ApplicationSubmissionBody;
}
