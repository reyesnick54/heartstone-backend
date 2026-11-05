import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InstrumentVerificationStatus, OfficialInstrumentStatus } from '@prisma/client';

/**
 * Public instrument verification result. Which optional fields are present depends on the
 * instrument type's public verification mode; restricted instruments return only the
 * status, timestamp, URI and disclaimer.
 */
export class PublicInstrumentVerificationResponseDto {
  @ApiProperty({ enum: InstrumentVerificationStatus })
  verificationStatus!: InstrumentVerificationStatus;

  @ApiProperty()
  verificationTimestamp!: string;

  @ApiProperty()
  verificationUri!: string;

  @ApiProperty()
  qrReferenceDisclaimer!: string;

  @ApiPropertyOptional()
  cryptographicVerificationPassed?: boolean;

  @ApiPropertyOptional({ type: [String] })
  cryptographicVerificationDetails?: string[];

  @ApiPropertyOptional()
  issuer?: string;

  @ApiPropertyOptional()
  instrumentType?: string;

  @ApiPropertyOptional()
  instrumentNumber?: string;

  @ApiPropertyOptional()
  effectiveDate?: string;

  @ApiPropertyOptional()
  expiryDate?: string;

  @ApiPropertyOptional({ enum: OfficialInstrumentStatus })
  currentLifecycleStatus?: OfficialInstrumentStatus;

  @ApiPropertyOptional()
  scopeSummary?: string;

  @ApiPropertyOptional()
  holderDisplay?: string;

  @ApiPropertyOptional()
  currentVersionIndicator?: number;
}
