import { ApiProperty } from '@nestjs/swagger';

/** Minimal public property registry facts (no internal parcel identifiers or sealed data). */
export class PublicPropertyRegistryVerificationResponseDto {
  @ApiProperty()
  parcelReference!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty({ type: String, nullable: true })
  locationSummary!: string | null;

  @ApiProperty()
  verificationTimestamp!: string;

  @ApiProperty()
  disclaimer!: string;
}
