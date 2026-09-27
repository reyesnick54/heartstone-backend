import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
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

  @ApiProperty({ type: [Object] })
  conditions!: unknown[];

  @ApiPropertyOptional({ type: CitizenRenewalProjectionDto })
  renewal?: CitizenRenewalProjectionDto;

  @ApiProperty()
  superseded!: boolean;

  @ApiPropertyOptional()
  downloadPath?: string;
}

export class CitizenPaymentReceiptDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  receiptNumber!: string;

  @ApiProperty()
  issuedAt!: string;
}

export class CitizenPaymentSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  invoiceNumber!: string;

  @ApiProperty({ enum: InvoiceStatus })
  status!: InvoiceStatus;

  @ApiProperty()
  balanceCents!: number;

  @ApiProperty()
  disclaimer!: string;
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

  @ApiProperty()
  acknowledged!: boolean;
}

export class CitizenRenewalQueueItemDto {
  @ApiProperty()
  instrumentId!: string;

  @ApiPropertyOptional()
  instrumentNumber?: string;

  @ApiProperty()
  renewalEligible!: boolean;

  @ApiPropertyOptional()
  daysUntilExpiry?: number;

  @ApiProperty()
  disclaimer!: string;
}

export class CitizenPaymentIntentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  intentReference!: string;

  @ApiProperty()
  disclaimer!: string;
}

export class CitizenMessageAcknowledgmentResponseDto {
  @ApiProperty()
  receiptId!: string;

  @ApiProperty()
  messageId!: string;

  @ApiProperty()
  disclaimer!: string;
}
