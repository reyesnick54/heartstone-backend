export interface BusinessOrganizationsBody {
  items: {
    organizationId: string;
    organizationCode: string;
    organizationName: string;
    accessPaths: string[];
  }[];
  disclaimer: { labelKey: string };
}

export interface BusinessOrganizationDetailBody {
  organizationId: string;
  organizationCode: string;
  organizationName: string;
  registrationStatusLabel: string;
  disclaimer: { labelKey: string };
}

export interface BusinessHomeBody {
  organizationId: string;
  counts: Record<string, number>;
  disclaimer: { labelKey: string };
}

export interface BusinessActionsBody {
  items: {
    actionCode: string;
    label: { labelKey: string };
    deepLink: { route: string; params: Record<string, string> };
  }[];
  pagination: { page: number; pageSize: number; totalItems: number };
}

export interface BusinessApplicationsBody {
  items: { applicationId: string; status: string }[];
  pagination: { totalItems: number };
  disclaimer: { labelKey: string };
}

export interface BusinessLicensesBody {
  items: { instrumentId: string; approachingExpiry: boolean }[];
  disclaimer: { labelKey: string };
}

export interface BusinessComplianceBody {
  items: {
    complianceMatterId: string;
    status: string;
    outstandingObligations: { obligationId: string; status: string }[];
  }[];
  disclaimer: { labelKey: string };
}

export interface BusinessPaymentsBody {
  items: { invoiceId: string; paymentDoesNotImplyApproval: boolean }[];
  disclaimer: { labelKey: string };
}

export interface BusinessMessagesBody {
  items: { communicationId: string; caseId: string }[];
  disclaimer: { labelKey: string };
}

export interface BusinessProjectsBody {
  items: {
    projectId: string;
    reportedStatusIsNotVerifiedCompletion: boolean;
    milestones: { milestoneId: string; isVerifiedCompletion: boolean }[];
  }[];
  disclaimer: { labelKey: string };
}

export function asBusinessOrganizationsBody(body: unknown): BusinessOrganizationsBody {
  return body as BusinessOrganizationsBody;
}

export function asBusinessOrganizationDetailBody(body: unknown): BusinessOrganizationDetailBody {
  return body as BusinessOrganizationDetailBody;
}

export function asBusinessHomeBody(body: unknown): BusinessHomeBody {
  return body as BusinessHomeBody;
}

export function asBusinessActionsBody(body: unknown): BusinessActionsBody {
  return body as BusinessActionsBody;
}

export function asBusinessApplicationsBody(body: unknown): BusinessApplicationsBody {
  return body as BusinessApplicationsBody;
}

export function asBusinessLicensesBody(body: unknown): BusinessLicensesBody {
  return body as BusinessLicensesBody;
}

export function asBusinessComplianceBody(body: unknown): BusinessComplianceBody {
  return body as BusinessComplianceBody;
}

export function asBusinessPaymentsBody(body: unknown): BusinessPaymentsBody {
  return body as BusinessPaymentsBody;
}

export function asBusinessMessagesBody(body: unknown): BusinessMessagesBody {
  return body as BusinessMessagesBody;
}

export function asBusinessProjectsBody(body: unknown): BusinessProjectsBody {
  return body as BusinessProjectsBody;
}
