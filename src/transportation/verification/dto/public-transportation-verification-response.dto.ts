import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PublicLicenseVerificationResponseDto {
  @ApiProperty({ enum: ['DRIVER_LICENSE'] })
  verificationKind!: 'DRIVER_LICENSE';

  @ApiProperty()
  lifecycleStatus!: string;

  @ApiProperty({ type: String, nullable: true })
  expiresAt!: string | null;

  @ApiProperty()
  verificationTimestamp!: string;

  @ApiProperty()
  disclaimer!: string;
}

/**
 * Data-minimized vehicle registration verification. Only the keys in
 * PUBLIC_VEHICLE_VERIFICATION_ALLOWED_FIELDS are ever returned; a key is omitted when the
 * underlying value is undefined.
 */
export class PublicVehicleVerificationResponseDto {
  @ApiPropertyOptional({ description: "Current registration lifecycle status, or 'UNKNOWN'" })
  verificationState?: string;

  @ApiPropertyOptional()
  registrationStatusLabel?: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  vehicleCategoryCode?: string | null;

  @ApiPropertyOptional()
  jurisdictionCode?: string;

  @ApiPropertyOptional()
  disclaimer?: string;
}

export class PublicOperatorVerificationResponseDto {
  @ApiProperty({ enum: ['TRANSPORT_OPERATOR'] })
  verificationKind!: 'TRANSPORT_OPERATOR';

  @ApiProperty()
  lifecycleStatus!: string;

  @ApiProperty()
  verificationTimestamp!: string;

  @ApiProperty()
  disclaimer!: string;
}
