export interface DepartmentRelationshipContext {
  departmentId: string;
  departmentName: string;
  departmentCode: string;
  institutionId: string;
  institutionName: string;
  appointmentIds: string[];
  officeIds: string[];
}

export interface ResolvedDepartmentManagementContext {
  identityId: string;
  departmentId: string;
  departmentName: string;
  departmentCode: string;
  institutionId: string;
  institutionName: string;
  hasManagementPolicy: true;
  hasDepartmentRelationship: boolean;
  authorityDisclaimer: string;
  aggregateDisclaimer: string;
}

export interface DepartmentMetricsFreshness {
  calculatedAt: string;
  staleAfter: string;
  isStale: boolean;
  staleDataDisclaimer: string;
}
