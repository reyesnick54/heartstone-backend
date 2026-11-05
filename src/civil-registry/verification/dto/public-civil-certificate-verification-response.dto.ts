import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CivilRegistryVerificationValidity } from '@prisma/client';

/** Minimal-disclosure civil certificate verification facts (no vital-record content). */
export class PublicCivilCertificateVerificationResponseDto {
  @ApiProperty()
  verificationReference!: string;

  @ApiProperty({ enum: CivilRegistryVerificationValidity })
  validityStatus!: CivilRegistryVerificationValidity;

  @ApiProperty()
  publicStatusLabel!: string;

  @ApiProperty({ description: 'Issuing institution name' })
  issuer!: string;

  @ApiProperty()
  certificateType!: string;

  @ApiProperty()
  documentHash!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  qrTokenReference?: string | null;

  @ApiPropertyOptional()
  registryVersionNumber?: number;

  @ApiProperty()
  verifiedAt!: string;

  @ApiProperty()
  minimalDisclosureDisclaimer!: string;
}
