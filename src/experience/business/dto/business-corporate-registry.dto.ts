import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BusinessCorporateProfileResponseDto {
  @ApiProperty({ format: 'uuid' })
  organizationId!: string;

  @ApiProperty({ format: 'uuid' })
  profileId!: string;

  @ApiPropertyOptional()
  registeredName!: string | null;

  @ApiPropertyOptional()
  registrationReference!: string | null;

  @ApiProperty()
  registrationStatus!: string;

  @ApiPropertyOptional()
  entityType!: string | null;

  @ApiPropertyOptional()
  registrationDate!: string | null;

  @ApiPropertyOptional({ type: Object })
  registeredOffice!: Record<string, unknown> | null;

  @ApiProperty({ type: [Object] })
  officers!: Record<string, unknown>[];

  @ApiPropertyOptional()
  filingStatus!: string | null;

  @ApiProperty({ type: [Object] })
  upcomingFilingRequirements!: Record<string, unknown>[];

  @ApiProperty({ type: [Object] })
  governmentCertificates!: Record<string, unknown>[];

  @ApiProperty({ type: [Object] })
  businessLicenses!: Record<string, unknown>[];

  @ApiProperty({ type: [Object] })
  complianceObligations!: Record<string, unknown>[];

  @ApiProperty({ type: [Object] })
  outstandingCorporateActions!: Record<string, unknown>[];

  @ApiPropertyOptional({ type: Object })
  beneficialOwnershipSummary!: Record<string, unknown> | null;

  @ApiProperty()
  representativeAccessLimited!: boolean;

  @ApiProperty()
  disclaimer!: string;
}

export class BusinessCorporateFilingsResponseDto {
  @ApiProperty({ type: [Object] })
  items!: Record<string, unknown>[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  totalItems!: number;
}

export class BusinessCorporateOfficersResponseDto {
  @ApiProperty({ type: [Object] })
  items!: Record<string, unknown>[];
}

export class BusinessCorporateCertificatesResponseDto {
  @ApiProperty({ type: [Object] })
  items!: Record<string, unknown>[];
}

export class BusinessCorporateActionsResponseDto {
  @ApiProperty({ type: [Object] })
  items!: Record<string, unknown>[];
}
