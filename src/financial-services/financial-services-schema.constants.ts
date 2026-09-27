export const FINANCIAL_SERVICES_FOUNDATION_MODEL_NAMES = [
  'FinancialRegulatedEntityProfile',
  'FinancialLicenceApplicationProfile',
  'FinancialLicenceRecord',
  'FinancialLicenceCondition',
  'FinancialLicenceStatusHistory',
  'FinancialResponsiblePersonReference',
  'FinancialBeneficialOwnershipLinkage',
  'FinancialExternalRegulatoryDependency',
  'FinancialInspectionReference',
  'FinancialComplianceMatterReference',
  'FinancialReportingRequirementReference',
  'FinancialRegulatoryAccessAudit',
  'FinancialServicesOperationalSnapshot',
] as const;

export const FINANCIAL_SERVICES_FOUNDATION_ENUM_NAMES = [
  'FinancialServicesDataClassification',
  'FinancialServicesActorPersona',
  'FinancialRegulatedEntityProfileStatus',
  'FinancialDelegatedFunctionActivation',
  'FinancialLicenceApplicationProfileStatus',
  'FinancialLicenceLifecycleStatus',
  'FinancialExternalRegulatoryDependencyStatus',
  'FinancialExternalRegulatoryDependencyRecordedBy',
  'FinancialReportingRequirementStatus',
] as const;

export const FORBIDDEN_CLIENT_LICENCE_ISSUANCE_FIELDS = [
  'lifecycleStatus',
  'licenceNumber',
  'governmentDecisionId',
  'officialInstrumentId',
  'absezIssuanceAuthorized',
  'authorityEvaluationRecordId',
] as const;

export const FORBIDDEN_CLIENT_EXTERNAL_DETERMINATION_FIELDS = [
  'isAuthenticated',
  'authenticatedPayloadHash',
  'spoofedAbsezApprovalAttempt',
  'status',
] as const;
