import { ApiProperty } from '@nestjs/swagger';

/** Policy-permitted corporate registry facts returned by public verification. */
export class PublicCorporateRegistryVerificationResponseDto {
  @ApiProperty({ type: String, nullable: true })
  registeredName!: string | null;

  @ApiProperty({ type: String, nullable: true })
  registrationReference!: string | null;

  @ApiProperty()
  status!: string;

  @ApiProperty({ type: String, nullable: true })
  jurisdictionCode!: string | null;

  @ApiProperty()
  verificationTimestamp!: string;

  @ApiProperty()
  disclaimer!: string;
}
