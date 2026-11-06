import { ApiProperty } from '@nestjs/swagger';
import {
  PaymentTransactionStatus,
  Prisma,
  TaxAssessmentStatus,
  TaxClearanceCertificateRequestStatus,
  TaxLiabilityStatus,
  TaxObjectionStatus,
  TaxObligationStatus,
  TaxpayerAccountKind,
  TaxpayerRegistrationStatus,
  TaxPaymentPlanStatus,
  TaxRefundClaimStatus,
  TaxReturnStatus,
} from '@prisma/client';

import { jsonValueSchema } from '../../../common/openapi/json-value.schema';

/** Scalar columns of a persisted `TaxPaymentPlan` row as serialized to JSON. */
export class TaxPaymentPlanRecordDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  taxpayerAccountId!: string;

  @ApiProperty()
  planReference!: string;

  @ApiProperty({ enum: TaxPaymentPlanStatus })
  status!: TaxPaymentPlanStatus;

  @ApiProperty({ ...jsonValueSchema() })
  schedule!: Prisma.JsonValue;

  @ApiProperty({ type: String, nullable: true })
  authorizedByOfficeholderId!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

/** Scalar columns of a persisted `TaxObjection` row as serialized to JSON. */
export class TaxObjectionRecordDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  taxpayerAccountId!: string;

  @ApiProperty()
  objectionReference!: string;

  @ApiProperty({ enum: TaxObjectionStatus })
  status!: TaxObjectionStatus;

  @ApiProperty({ type: String, nullable: true })
  relatedAssessmentId!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  filedAt!: Date;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  decidedAt!: Date | null;

  @ApiProperty({ type: String, nullable: true })
  grounds!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

/** Scalar columns of a persisted `TaxObligation` row as serialized to JSON. */
export class TaxObligationRecordDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  taxpayerAccountId!: string;

  @ApiProperty()
  taxTypeDefinitionId!: string;

  @ApiProperty({ type: String, nullable: true })
  taxPeriodId!: string | null;

  @ApiProperty()
  obligationCode!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({ enum: TaxObligationStatus })
  status!: TaxObligationStatus;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  dueDate!: Date | null;

  @ApiProperty({ ...jsonValueSchema() })
  configuration!: Prisma.JsonValue;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

/** Scalar columns of a persisted `TaxReturn` row as serialized to JSON. */
export class TaxReturnRecordDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  taxpayerAccountId!: string;

  @ApiProperty()
  taxTypeDefinitionId!: string;

  @ApiProperty()
  taxPeriodId!: string;

  @ApiProperty()
  returnReference!: string;

  @ApiProperty({ enum: TaxReturnStatus })
  status!: TaxReturnStatus;

  @ApiProperty({ type: String, nullable: true })
  currentVersionId!: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  submittedAt!: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

/** Scalar columns of a persisted `TaxReturnVersion` row as serialized to JSON. */
export class TaxReturnVersionRecordDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  taxReturnId!: string;

  @ApiProperty()
  versionNumber!: number;

  @ApiProperty()
  isAmendment!: boolean;

  @ApiProperty({ ...jsonValueSchema() })
  declarationData!: Prisma.JsonValue;

  @ApiProperty()
  payloadHash!: string;

  @ApiProperty({ type: String, nullable: true })
  submittedByIdentityId!: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  submittedAt!: Date | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  lockedAt!: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

/** Scalar columns of a persisted `TaxAssessment` row as serialized to JSON. */
export class TaxAssessmentRecordDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  taxpayerAccountId!: string;

  @ApiProperty()
  taxTypeDefinitionId!: string;

  @ApiProperty()
  taxPeriodId!: string;

  @ApiProperty({ type: String, nullable: true })
  taxReturnId!: string | null;

  @ApiProperty()
  assessmentReference!: string;

  @ApiProperty({ enum: TaxAssessmentStatus })
  status!: TaxAssessmentStatus;

  @ApiProperty({ type: String, nullable: true })
  supersedesAssessmentId!: string | null;

  @ApiProperty({ type: String, nullable: true })
  issuedByOfficeholderId!: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  issuedAt!: Date | null;

  @ApiProperty({ type: String, nullable: true })
  calculationRecordId!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

/** Scalar columns of a persisted `TaxLiability` row as serialized to JSON. */
export class TaxLiabilityRecordDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  taxpayerAccountId!: string;

  @ApiProperty({ type: String, nullable: true })
  taxAssessmentId!: string | null;

  @ApiProperty({ type: String, nullable: true })
  invoiceId!: string | null;

  @ApiProperty()
  liabilityReference!: string;

  @ApiProperty({ enum: TaxLiabilityStatus })
  status!: TaxLiabilityStatus;

  @ApiProperty()
  principalCents!: number;

  @ApiProperty()
  currency!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

/** Scalar columns of a persisted `PaymentTransaction` row as serialized to JSON. */
export class PaymentTransactionRecordDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  paymentIntentId!: string;

  @ApiProperty()
  paymentProviderConfigurationId!: string;

  @ApiProperty()
  providerTransactionReference!: string;

  @ApiProperty({ enum: PaymentTransactionStatus })
  status!: PaymentTransactionStatus;

  @ApiProperty()
  amountCents!: number;

  @ApiProperty()
  currency!: string;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  authorizedAt!: Date | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  settledAt!: Date | null;

  @ApiProperty({ type: String, nullable: true })
  failureReason!: string | null;

  @ApiProperty({ ...jsonValueSchema(), nullable: true })
  rawResponse!: Prisma.JsonValue;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

/** Scalar columns of a persisted `TaxPaymentAllocation` row as serialized to JSON. */
export class TaxPaymentAllocationRecordDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  taxLiabilityId!: string;

  @ApiProperty()
  paymentTransactionId!: string;

  @ApiProperty({ type: String, nullable: true })
  paymentAllocationId!: string | null;

  @ApiProperty()
  allocatedAmountCents!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  allocatedAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

export class CitizenTaxAccountSummaryDto {
  @ApiProperty()
  accountId!: string;

  @ApiProperty()
  accountNumber!: string;

  @ApiProperty()
  displayName!: string;

  @ApiProperty({ enum: TaxpayerAccountKind })
  accountKind!: TaxpayerAccountKind;
}

export class CitizenTaxObligationSummaryDto {
  @ApiProperty()
  obligationId!: string;

  @ApiProperty()
  obligationCode!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({ type: String, nullable: true })
  dueDate!: string | null;

  @ApiProperty({ enum: TaxObligationStatus })
  status!: TaxObligationStatus;
}

export class CitizenTaxAssessmentSummaryDto {
  @ApiProperty()
  assessmentId!: string;

  @ApiProperty()
  assessmentReference!: string;

  @ApiProperty({ enum: TaxAssessmentStatus })
  status!: TaxAssessmentStatus;
}

export class CitizenTaxRefundSummaryDto {
  @ApiProperty()
  refundClaimId!: string;

  @ApiProperty({ enum: TaxRefundClaimStatus })
  status!: TaxRefundClaimStatus;

  @ApiProperty()
  requestedAmountCents!: number;

  @ApiProperty({ description: 'ISO 4217 currency recorded on the refund claim' })
  currency!: string;
}

export class CitizenTaxBalanceByCurrencyDto {
  @ApiProperty({ description: 'ISO 4217 currency recorded on the arrears' })
  currency!: string;

  @ApiProperty()
  amountCents!: number;
}

export class CitizenTaxClearanceSummaryDto {
  @ApiProperty()
  requestId!: string;

  @ApiProperty({ enum: TaxClearanceCertificateRequestStatus })
  status!: TaxClearanceCertificateRequestStatus;
}

export class CitizenRevenueHomeResponseDto {
  @ApiProperty()
  generatedAt!: string;

  @ApiProperty({ enum: ['NON_PRODUCTION'] })
  ruleEnvironment!: 'NON_PRODUCTION';

  @ApiProperty()
  disclaimer!: string;

  @ApiProperty()
  taxpayerAccountId!: string;

  @ApiProperty()
  taxpayerIdentifier!: string;

  @ApiProperty()
  accountNumber!: string;

  @ApiProperty({ enum: TaxpayerRegistrationStatus, nullable: true })
  registrationStatus!: TaxpayerRegistrationStatus | null;

  @ApiProperty({ type: () => [CitizenTaxAccountSummaryDto] })
  activeTaxAccounts!: CitizenTaxAccountSummaryDto[];

  @ApiProperty({ type: () => [CitizenTaxObligationSummaryDto] })
  upcomingObligations!: CitizenTaxObligationSummaryDto[];

  @ApiProperty({ description: 'Number of draft returns awaiting filing' })
  outstandingReturns!: number;

  @ApiProperty({ type: () => [CitizenTaxAssessmentSummaryDto] })
  assessments!: CitizenTaxAssessmentSummaryDto[];

  @ApiProperty({
    description:
      'Sum of outstanding arrears. Only meaningful with outstandingBalanceCurrency; see outstandingBalances when arrears span currencies.',
  })
  outstandingBalanceCents!: number;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      "Currency of outstandingBalanceCents: the arrears' currency, or the jurisdiction's configured default currency when there are no arrears. Null when arrears span currencies or no default is configured.",
  })
  outstandingBalanceCurrency!: string | null;

  @ApiProperty({ type: () => [CitizenTaxBalanceByCurrencyDto] })
  outstandingBalances!: CitizenTaxBalanceByCurrencyDto[];

  @ApiProperty({ type: () => [CitizenTaxRefundSummaryDto] })
  refunds!: CitizenTaxRefundSummaryDto[];

  @ApiProperty({ type: () => [TaxPaymentPlanRecordDto] })
  paymentPlans!: TaxPaymentPlanRecordDto[];

  @ApiProperty({ type: () => [TaxObjectionRecordDto] })
  disputes!: TaxObjectionRecordDto[];

  @ApiProperty({ type: () => [CitizenTaxClearanceSummaryDto] })
  complianceClearance!: CitizenTaxClearanceSummaryDto[];

  @ApiProperty()
  paymentDoesNotAlterAssessment!: boolean;
}

export class CitizenTaxAccountItemDto {
  @ApiProperty()
  taxpayerAccountId!: string;

  @ApiProperty()
  accountNumber!: string;

  @ApiProperty()
  displayName!: string;

  @ApiProperty({ enum: TaxpayerAccountKind })
  accountKind!: TaxpayerAccountKind;
}

export class CitizenTaxAccountsResponseDto {
  @ApiProperty({ type: () => [CitizenTaxAccountItemDto] })
  items!: CitizenTaxAccountItemDto[];
}

export class CitizenTaxObligationsResponseDto {
  @ApiProperty()
  authoritativeOnly!: boolean;

  @ApiProperty({ type: () => [TaxObligationRecordDto] })
  obligations!: TaxObligationRecordDto[];

  @ApiProperty()
  outstandingBalanceCents!: number;

  @ApiProperty()
  note!: string;
}

export class TaxReturnWithVersionDto extends TaxReturnRecordDto {
  @ApiProperty({ type: () => TaxReturnVersionRecordDto, nullable: true })
  currentVersion!: TaxReturnVersionRecordDto | null;
}

export class CitizenTaxReturnsPaginationDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  totalItems!: number;
}

export class CitizenTaxReturnsResponseDto {
  @ApiProperty({ type: () => [TaxReturnWithVersionDto] })
  items!: TaxReturnWithVersionDto[];

  @ApiProperty({ type: () => CitizenTaxReturnsPaginationDto })
  pagination!: CitizenTaxReturnsPaginationDto;
}

export class CitizenTaxPaymentItemDto extends TaxPaymentAllocationRecordDto {
  @ApiProperty({ type: () => PaymentTransactionRecordDto })
  paymentTransaction!: PaymentTransactionRecordDto;

  @ApiProperty({ type: () => TaxLiabilityRecordDto })
  taxLiability!: TaxLiabilityRecordDto;
}

export class CitizenRevenueActionDto {
  @ApiProperty()
  actionCode!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty({ description: 'HIGH, MEDIUM or LOW' })
  priority!: string;
}

export class CitizenRevenueActionsResponseDto {
  @ApiProperty()
  generatedAt!: string;

  @ApiProperty({ type: () => [CitizenRevenueActionDto] })
  actions!: CitizenRevenueActionDto[];
}
