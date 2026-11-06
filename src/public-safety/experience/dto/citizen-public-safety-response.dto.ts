import { ApiProperty } from '@nestjs/swagger';
import { PublicSafetyEmergencyEventStatus, PublicSafetyServiceRequestStatus } from '@prisma/client';

export class CitizenPublicSafetyHomeResponseDto {
  @ApiProperty()
  disclaimer!: string;

  @ApiProperty({ enum: ['NON_PRODUCTION'] })
  ruleEnvironment!: 'NON_PRODUCTION';

  @ApiProperty()
  incidentReportCount!: number;

  @ApiProperty()
  assistanceRequestCount!: number;

  @ApiProperty()
  publicEmergencyEventCount!: number;

  @ApiProperty()
  openActionCount!: number;
}

export class CitizenIncidentReportItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ description: 'Incident reference shown to the reporter' })
  incidentReference!: string;

  @ApiProperty({ format: 'date-time' })
  submittedAt!: string;

  @ApiProperty()
  summaryLabel!: string;

  @ApiProperty({ type: String, nullable: true })
  locationDescription!: string | null;

  @ApiProperty()
  verificationStatus!: string;

  @ApiProperty({ description: "'verified' or 'unverified'" })
  verificationLabel!: string;

  @ApiProperty()
  isVerified!: boolean;

  @ApiProperty()
  reporterIdentityRedacted!: boolean;
}

export class CitizenIncidentReportsResponseDto {
  @ApiProperty({ type: () => [CitizenIncidentReportItemDto] })
  items!: CitizenIncidentReportItemDto[];
}

export class CitizenEmergencyEventItemDto {
  @ApiProperty()
  eventReference!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ enum: PublicSafetyEmergencyEventStatus })
  status!: PublicSafetyEmergencyEventStatus;

  @ApiProperty({ type: String, nullable: true })
  publicSummary!: string | null;

  @ApiProperty()
  isOfficialDeclaration!: boolean;

  @ApiProperty()
  informationalOnly!: boolean;
}

export class CitizenEmergencyEventsResponseDto {
  @ApiProperty()
  disclaimer!: string;

  @ApiProperty({ type: () => [CitizenEmergencyEventItemDto] })
  items!: CitizenEmergencyEventItemDto[];
}

export class CitizenRecoveryAssistanceItemDto {
  @ApiProperty()
  applicationReference!: string;

  @ApiProperty()
  programCode!: string;

  @ApiProperty({ enum: PublicSafetyServiceRequestStatus })
  status!: PublicSafetyServiceRequestStatus;

  @ApiProperty()
  isRecoveryProgram!: boolean;

  @ApiProperty()
  isIncidentReport!: boolean;
}

export class CitizenRecoveryAssistanceResponseDto {
  @ApiProperty({ type: () => [CitizenRecoveryAssistanceItemDto] })
  items!: CitizenRecoveryAssistanceItemDto[];
}

export class CitizenPublicSafetyActionItemDto {
  @ApiProperty()
  actionCode!: string;

  @ApiProperty()
  requestReference!: string;

  @ApiProperty()
  serviceTemplateCode!: string;

  @ApiProperty()
  blockedEmergencyAlertIssuance!: boolean;
}

export class CitizenPublicSafetyActionsResponseDto {
  @ApiProperty()
  disclaimer!: string;

  @ApiProperty({ type: () => [CitizenPublicSafetyActionItemDto] })
  availableActions!: CitizenPublicSafetyActionItemDto[];

  @ApiProperty({ type: [String] })
  forbiddenActions!: string[];
}
