import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CitizenImmigrationStatusSummaryDto {
  @ApiProperty()
  verifiedStatusLabel!: string;

  @ApiPropertyOptional()
  publicMessage?: string;

  @ApiProperty()
  disclaimer!: string;
}

export class CitizenImmigrationApplicationItemDto {
  @ApiProperty()
  applicationId!: string;

  @ApiProperty()
  serviceName!: string;

  @ApiProperty()
  serviceCode!: string;

  @ApiProperty()
  statusLabel!: string;

  @ApiPropertyOptional()
  caseId?: string;
}

export class CitizenImmigrationApplicationsResponseDto {
  @ApiProperty({ type: [CitizenImmigrationApplicationItemDto] })
  items!: CitizenImmigrationApplicationItemDto[];
}

export class CitizenImmigrationCredentialItemDto {
  @ApiProperty()
  credentialId!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional()
  effectiveUntil?: string;

  @ApiPropertyOptional()
  renewalEligible?: boolean;
}

export class CitizenImmigrationCredentialsResponseDto {
  @ApiProperty({ type: [CitizenImmigrationCredentialItemDto] })
  items!: CitizenImmigrationCredentialItemDto[];
}

export class CitizenImmigrationActionItemDto {
  @ApiProperty()
  actionKey!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  available!: boolean;
}

export class CitizenImmigrationActionsResponseDto {
  @ApiProperty({ type: [CitizenImmigrationActionItemDto] })
  items!: CitizenImmigrationActionItemDto[];
}

export class CitizenImmigrationOverviewResponseDto {
  @ApiProperty()
  packId!: string;

  @ApiProperty()
  packLabel!: string;

  @ApiProperty()
  disclaimer!: string;

  @ApiProperty()
  activeApplicationsCount!: number;

  @ApiProperty()
  credentialsCount!: number;

  @ApiProperty()
  pendingActionsCount!: number;
}

export class CitizenImmigrationStatusResponseDto {
  @ApiProperty({ type: [CitizenImmigrationStatusSummaryDto] })
  statuses!: CitizenImmigrationStatusSummaryDto[];

  @ApiProperty()
  requestedInformationCount!: number;

  @ApiProperty()
  upcomingInterviewsCount!: number;

  @ApiProperty()
  upcomingBiometricsCount!: number;

  @ApiProperty()
  outstandingFeesCount!: number;

  @ApiProperty()
  openAppealsCount!: number;
}
