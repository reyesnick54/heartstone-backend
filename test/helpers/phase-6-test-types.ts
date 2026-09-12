export interface ApplicationBody {
  id: string;
  applicationNumber?: string | null;
  status: string;
}

export interface ApplicationSubmissionBody {
  id: string;
  submissionNumber: string;
  acknowledgmentReference?: string | null;
  contentHash: string;
  status: string;
}

export interface CaseBody {
  id: string;
  caseNumber: string;
  status: string;
}

export interface SubmitApplicationResponseBody {
  applicationId: string;
  applicationNumber: string;
  submission: ApplicationSubmissionBody;
  case: CaseBody;
}

export interface ApplicantStatusBody {
  communications: { body: string }[];
}

export interface ReferralBody {
  id: string;
}

export function asApplicationBody(body: unknown): ApplicationBody {
  return body as ApplicationBody;
}

export function asSubmitApplicationResponseBody(body: unknown): SubmitApplicationResponseBody {
  return body as SubmitApplicationResponseBody;
}

export function asApplicantStatusBody(body: unknown): ApplicantStatusBody {
  return body as ApplicantStatusBody;
}

export function asReferralBody(body: unknown): ReferralBody {
  return body as ReferralBody;
}
