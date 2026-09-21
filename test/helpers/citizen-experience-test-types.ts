export interface CitizenMeResponse {
  profile: { identityId: string };
  accountAssurance: { hasGovernmentAuthority: boolean };
  disclaimer: { labelKey: string };
  representationRelationships: { representativeAuthorityId: string }[];
}

export interface CitizenHomeResponse {
  counts: Record<string, number>;
  disclaimer: { labelKey: string };
}

export interface CitizenApplicationsResponse {
  items: { applicationId: string }[];
  pagination: {
    totalItems: number;
    hasNextPage: boolean;
    page: number;
    pageSize: number;
  };
}

export interface CitizenApplicationDetailResponse {
  applicationId: string;
  attribution: { serviceId: string };
  disclaimer: { labelKey: string };
}

export interface CitizenCaseStatusResponse {
  caseId: string;
  applicantDisclaimer: { labelKey: string };
}

export interface CitizenActionResponse {
  actionCode: string;
  label: { labelKey: string };
  deepLink: { route: string };
}

export interface CitizenActionsListResponse {
  items: CitizenActionResponse[];
  pagination: { page: number; pageSize: number };
}

export function asCitizenMeBody(body: unknown): CitizenMeResponse {
  return body as CitizenMeResponse;
}

export function asCitizenHomeBody(body: unknown): CitizenHomeResponse {
  return body as CitizenHomeResponse;
}

export function asCitizenApplicationsBody(body: unknown): CitizenApplicationsResponse {
  return body as CitizenApplicationsResponse;
}

export function asCitizenApplicationDetailBody(body: unknown): CitizenApplicationDetailResponse {
  return body as CitizenApplicationDetailResponse;
}

export function asCitizenCaseStatusBody(body: unknown): CitizenCaseStatusResponse {
  return body as CitizenCaseStatusResponse;
}

export function asCitizenActionsBody(body: unknown): CitizenActionsListResponse {
  return body as CitizenActionsListResponse;
}
