export interface DepartmentMeBody {
  identityId: string;
  hasUniversalAuthority: boolean;
  dashboardVisibilityDoesNotCreateAuthority: boolean;
  departments: {
    departmentId: string;
    hasManagementAccess: boolean;
    hasDepartmentRelationship: boolean;
  }[];
}

export interface DepartmentHomeBody {
  departmentId: string;
  openCases: number;
  unassignedWorkload: number;
  metricsFreshness: {
    isStale: boolean;
    staleDataDisclaimer: string;
  };
  aggregateDoesNotCreateCaseDisposition: boolean;
  dashboardVisibilityDoesNotCreateAuthority: boolean;
}

export interface DepartmentServicesBody {
  items: {
    serviceId: string;
    serviceSuspended: boolean;
    status: string;
  }[];
  suspendedServiceCount: number;
}

export interface DepartmentWorkloadBody {
  totalCases: number;
  unassignedWorkload: number;
  statusBreakdown: { status: string; count: number }[];
}

export interface DepartmentComplianceBody {
  restrictedInternalRecordsScoped: boolean;
  openMatters: { complianceMatterId: string }[];
}

export function asDepartmentMeBody(body: unknown): DepartmentMeBody {
  return body as DepartmentMeBody;
}

export function asDepartmentHomeBody(body: unknown): DepartmentHomeBody {
  return body as DepartmentHomeBody;
}

export function asDepartmentServicesBody(body: unknown): DepartmentServicesBody {
  return body as DepartmentServicesBody;
}

export function asDepartmentWorkloadBody(body: unknown): DepartmentWorkloadBody {
  return body as DepartmentWorkloadBody;
}

export function asDepartmentComplianceBody(body: unknown): DepartmentComplianceBody {
  return body as DepartmentComplianceBody;
}
