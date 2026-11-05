import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CivilRegistryCertificateStatus,
  CivilRegistryRecordStatus,
  CommunicationChannelType,
  CommunicationMessageStatus,
  InvoiceStatus,
  OfficialInstrumentStatus,
} from '@prisma/client';

export class CitizenInstitutionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;
}

export class CitizenDocumentIntegrityDto {
  @ApiProperty()
  sha256!: string;

  @ApiProperty()
  signatureStatus!: string;

  @ApiProperty()
  sealStatus!: string;

  @ApiProperty()
  authenticityStatus!: string;
}

export class CitizenDocumentDownloadDto {
  @ApiProperty()
  versionId!: string;

  @ApiProperty()
  downloadPath!: string;
}

export class CitizenRelatedServiceDto {
  @ApiPropertyOptional()
  caseId?: string;

  @ApiPropertyOptional()
  caseReference?: string;

  @ApiPropertyOptional()
  serviceName?: string;
}

export class CitizenDocumentSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  documentType!: string;

  @ApiPropertyOptional({ type: CitizenInstitutionDto })
  originatingInstitution?: CitizenInstitutionDto;

  @ApiPropertyOptional({ type: CitizenRelatedServiceDto })
  relatedService?: CitizenRelatedServiceDto;

  @ApiPropertyOptional()
  issueOrSubmissionDate?: string;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional()
  expiryDate?: string;

  @ApiProperty({ type: CitizenDocumentIntegrityDto })
  integrity!: CitizenDocumentIntegrityDto;

  @ApiPropertyOptional({ type: CitizenDocumentDownloadDto })
  download?: CitizenDocumentDownloadDto;

  @ApiProperty()
  disclaimer!: string;
}

export class CitizenDocumentDetailDto extends CitizenDocumentSummaryDto {
  @ApiProperty()
  documentNumber!: string;

  @ApiProperty()
  sourceType!: string;

  @ApiProperty()
  currentVersionNumber!: number;
}

export class CitizenRenewalProjectionDto {
  @ApiProperty()
  eligible!: boolean;

  @ApiPropertyOptional()
  nextStep?: string;

  @ApiPropertyOptional()
  reason?: string;
}

export class CitizenCredentialSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional()
  instrumentNumber?: string;

  @ApiPropertyOptional()
  instrumentType?: string;

  @ApiPropertyOptional()
  instrumentKind?: string;

  @ApiProperty({ type: CitizenInstitutionDto })
  issuer!: CitizenInstitutionDto;

  @ApiProperty({ enum: OfficialInstrumentStatus })
  status!: OfficialInstrumentStatus;

  @ApiPropertyOptional()
  effectiveFrom?: string;

  @ApiPropertyOptional()
  effectiveUntil?: string;

  @ApiPropertyOptional()
  verificationReference?: string;

  @ApiProperty({
    type: 'array',
    items: {},
    description: 'Instrument conditions exactly as recorded on the current instrument version',
  })
  conditions!: unknown[];

  @ApiPropertyOptional({ type: CitizenRenewalProjectionDto })
  renewal?: CitizenRenewalProjectionDto;

  @ApiProperty()
  superseded!: boolean;

  @ApiPropertyOptional()
  downloadPath?: string;
}

export class CitizenCredentialDetailDto extends CitizenCredentialSummaryDto {
  @ApiPropertyOptional()
  scopeSummary?: string;

  @ApiPropertyOptional()
  holderDisplay?: string;

  @ApiPropertyOptional()
  currentVersionNumber?: number;

  @ApiPropertyOptional()
  verificationUri?: string;
}

export class CitizenPaymentFeeAssessmentDto {
  @ApiProperty()
  assessmentReference!: string;

  @ApiProperty()
  totalAmountCents!: number;

  @ApiProperty()
  currency!: string;
}

export class CitizenPaymentReceiptDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  receiptNumber!: string;

  @ApiProperty()
  issuedAt!: string;
}

export class CitizenPaymentRefundDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  requestedAmountCents!: number;

  @ApiProperty()
  reason!: string;
}

export class CitizenPaymentDisputeDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  disputeReference!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  amountCents!: number;

  @ApiProperty()
  reason!: string;
}

export class CitizenPaymentSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  invoiceNumber!: string;

  @ApiProperty({ enum: InvoiceStatus })
  status!: InvoiceStatus;

  @ApiProperty({ type: CitizenPaymentFeeAssessmentDto })
  feeAssessment!: CitizenPaymentFeeAssessmentDto;

  @ApiProperty()
  balanceCents!: number;

  @ApiProperty()
  totalAmountCents!: number;

  @ApiProperty()
  amountPaidCents!: number;

  @ApiProperty()
  currency!: string;

  @ApiPropertyOptional()
  issuedAt?: string;

  @ApiPropertyOptional()
  dueAt?: string;

  @ApiPropertyOptional()
  relatedCaseId?: string;

  @ApiProperty({ type: [CitizenPaymentReceiptDto] })
  receipts!: CitizenPaymentReceiptDto[];

  @ApiProperty({ type: [CitizenPaymentRefundDto] })
  refunds!: CitizenPaymentRefundDto[];

  @ApiProperty({ type: [CitizenPaymentDisputeDto] })
  disputes!: CitizenPaymentDisputeDto[];

  @ApiProperty()
  disclaimer!: string;
}

export class CitizenPaymentLineDto {
  @ApiProperty()
  lineCode!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  lineAmountCents!: number;
}

export class CitizenPaymentIntentSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  intentReference!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  amountCents!: number;
}

export class CitizenPaymentDetailDto extends CitizenPaymentSummaryDto {
  @ApiProperty({ type: [CitizenPaymentLineDto] })
  lines!: CitizenPaymentLineDto[];

  @ApiProperty({ type: [CitizenPaymentIntentSummaryDto] })
  paymentIntents!: CitizenPaymentIntentSummaryDto[];
}

export class CitizenMessageSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  messageReference!: string;

  @ApiProperty()
  subject!: string;

  @ApiProperty({ enum: CommunicationChannelType })
  channelType!: CommunicationChannelType;

  @ApiProperty({ enum: CommunicationMessageStatus })
  status!: CommunicationMessageStatus;

  @ApiPropertyOptional()
  deliveredAt?: string;

  @ApiPropertyOptional()
  caseId?: string;

  @ApiProperty()
  acknowledged!: boolean;
}

export class CitizenMessageDeliveryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: CommunicationChannelType })
  channelType!: CommunicationChannelType;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional()
  completedAt?: string;
}

export class CitizenMessageDetailDto extends CitizenMessageSummaryDto {
  @ApiProperty()
  body!: string;

  @ApiPropertyOptional()
  decisionNoticeReference?: string;

  @ApiProperty({ type: [CitizenMessageDeliveryDto] })
  deliveries!: CitizenMessageDeliveryDto[];
}

export class CitizenRenewalQueueItemDto {
  @ApiProperty()
  instrumentId!: string;

  @ApiPropertyOptional()
  instrumentNumber?: string;

  @ApiPropertyOptional()
  instrumentType?: string;

  @ApiProperty({ type: CitizenInstitutionDto })
  issuer!: CitizenInstitutionDto;

  @ApiProperty({ enum: OfficialInstrumentStatus })
  status!: OfficialInstrumentStatus;

  @ApiPropertyOptional()
  effectiveUntil?: string;

  @ApiPropertyOptional()
  daysUntilExpiry?: number;

  @ApiProperty()
  renewalEligible!: boolean;

  @ApiPropertyOptional()
  renewalReason?: string;

  @ApiPropertyOptional()
  nextStep?: string;

  @ApiProperty()
  disclaimer!: string;
}

export class CitizenPaymentIntentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  intentReference!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  amountCents!: number;

  @ApiProperty()
  currency!: string;

  @ApiProperty()
  invoiceId!: string;

  @ApiProperty()
  disclaimer!: string;
}

export class CitizenMessageAcknowledgmentResponseDto {
  @ApiProperty()
  receiptId!: string;

  @ApiProperty()
  messageId!: string;

  @ApiProperty()
  receivedAt!: string;

  @ApiProperty()
  disclaimer!: string;
}

export class CitizenBoundaryDisclaimerResponseDto {
  @ApiProperty()
  disclaimer!: string;
}

export class CitizenCivilStatusResponseDto {
  @ApiProperty()
  identityId!: string;

  @ApiProperty()
  entitledRecordCount!: number;

  @ApiProperty()
  officialRecordCount!: number;

  @ApiProperty()
  pendingSubmissionCount!: number;

  @ApiProperty()
  templateDisclaimer!: string;
}

export class CitizenVitalRecordSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  recordNumber!: string;

  @ApiProperty()
  eventType!: string;

  @ApiProperty({ enum: CivilRegistryRecordStatus })
  status!: CivilRegistryRecordStatus;

  @ApiPropertyOptional({ type: String, nullable: true })
  summaryLabel?: string | null;

  @ApiPropertyOptional()
  registryVersionNumber?: number;

  @ApiProperty()
  isSealed!: boolean;

  @ApiProperty()
  isRestricted!: boolean;

  @ApiProperty()
  institutionName!: string;
}

export class CitizenCivilCertificateSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  certificateType!: string;

  @ApiProperty({ enum: CivilRegistryCertificateStatus })
  status!: CivilRegistryCertificateStatus;

  @ApiPropertyOptional()
  issuedAt?: string;

  @ApiProperty()
  vitalRecordId!: string;

  @ApiProperty()
  registryVersionId!: string;

  @ApiPropertyOptional()
  verificationReference?: string;

  @ApiPropertyOptional()
  requestViaServiceSlug?: string;
}

export class CitizenCivilRegistryActionDto {
  @ApiProperty()
  actionCode!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  serviceSlug!: string;

  @ApiProperty()
  description!: string;
}
