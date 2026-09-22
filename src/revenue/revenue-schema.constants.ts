export const PHASE_REVENUE_MODEL_NAMES = [
  'TaxTypeDefinition',
  'TaxTypeDefinitionVersion',
  'TaxpayerAccount',
  'TaxpayerRegistration',
  'TaxpayerIdentifier',
  'TaxPeriod',
  'TaxObligation',
  'TaxReturn',
  'TaxReturnVersion',
  'TaxDeclaration',
  'TaxAssessment',
  'TaxAssessmentLine',
  'TaxCalculationRecord',
  'TaxLiability',
  'TaxCredit',
  'TaxAccountBalance',
  'TaxPaymentAllocation',
  'TaxRefundClaim',
  'TaxRefundDecision',
  'TaxArrear',
  'TaxPaymentPlan',
  'TaxComplianceStatus',
  'TaxAuditMatter',
  'TaxObjection',
  'TaxDispute',
  'TaxClearanceCertificateRequest',
  'TaxWithholdingRecord',
  'TaxAccessAudit',
] as const;

export const PHASE_REVENUE_ENUM_NAMES = [
  'TaxpayerAccountKind',
  'TaxpayerRegistrationStatus',
  'TaxpayerIdentifierKind',
  'TaxTypeDefinitionStatus',
  'TaxPeriodStatus',
  'TaxObligationStatus',
  'TaxReturnStatus',
  'TaxDeclarationStatus',
  'TaxAssessmentStatus',
  'TaxLiabilityStatus',
  'TaxCreditStatus',
  'TaxAccountBalanceKind',
  'TaxRefundClaimStatus',
  'TaxRefundDecisionOutcome',
  'TaxArrearStatus',
  'TaxPaymentPlanStatus',
  'TaxComplianceStatusCode',
  'TaxAuditMatterStatus',
  'TaxObjectionStatus',
  'TaxDisputeStatus',
  'TaxClearanceCertificateRequestStatus',
  'TaxWithholdingRecordStatus',
  'TaxAccessActorKind',
  'TaxCalculationSourceKind',
] as const;

export const FORBIDDEN_TAX_ASSESSMENT_CLIENT_FIELDS = [
  'status',
  'issuedAt',
  'calculationRecordId',
  'issuedByOfficeholderId',
  'assessmentReference',
] as const;

export const FORBIDDEN_TAX_RETURN_CLIENT_FIELDS = [
  'status',
  'currentVersionId',
  'submittedAt',
] as const;

export const FORBIDDEN_TAX_LIABILITY_CLIENT_FIELDS = [
  'status',
  'principalCents',
  'liabilityReference',
] as const;

export const FORBIDDEN_TAX_REFUND_CLIENT_FIELDS = [
  'status',
  'authorizedAmountCents',
  'outcome',
  'decidedAt',
  'financialRefundRequestId',
] as const;

export const FORBIDDEN_TAX_CLEARANCE_CLIENT_FIELDS = [
  'status',
  'issuedAt',
  'expiresAt',
  'authoritativeConditionsMet',
] as const;
