export interface CaseCommunicationResponse {
  id: string;
  communicationType: string;
  senderIdentityId?: string | null;
  recipientType: string;
  channel: string;
  body: string;
  sentAt?: string | null;
}

export interface CasePublicStatusResponse {
  publicStage: string;
  publicStageLabel: string;
  publicStageDetail?: string | null;
}

export interface CaseTimelineEventResponse {
  eventType: string;
}

export interface CaseDashboardResponse {
  caseManager: { officeholderId: string; name: string } | null;
  assignmentDoesNotImplyAuthority: boolean;
  nextAuthorizedAdministrativeActions: unknown[];
}

export function asCaseCommunicationsBody(body: unknown): CaseCommunicationResponse[] {
  return body as CaseCommunicationResponse[];
}

export function asCaseCommunicationBody(body: unknown): CaseCommunicationResponse {
  return body as CaseCommunicationResponse;
}

export function asCasePublicStatusBody(body: unknown): CasePublicStatusResponse {
  return body as CasePublicStatusResponse;
}

export function asCaseTimelineBody(body: unknown): CaseTimelineEventResponse[] {
  return body as CaseTimelineEventResponse[];
}

export function asCaseDashboardBody(body: unknown): CaseDashboardResponse {
  return body as CaseDashboardResponse;
}
