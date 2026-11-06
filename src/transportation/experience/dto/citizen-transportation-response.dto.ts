import { ApiProperty } from '@nestjs/swagger';
import { CaseStatus, DriverLicenseLifecycleStatus, DriverTestRecordOutcome } from '@prisma/client';

export class CitizenDriverLicenseSummaryDto {
  @ApiProperty()
  licenseNumber!: string;

  @ApiProperty({ enum: DriverLicenseLifecycleStatus })
  lifecycleStatus!: DriverLicenseLifecycleStatus;

  @ApiProperty({ type: String, nullable: true })
  expiresAt!: string | null;

  @ApiProperty({ type: [String] })
  classes!: string[];

  @ApiProperty({ type: [String] })
  endorsements!: string[];

  @ApiProperty()
  isSuspended!: boolean;
}

export class CitizenVehicleHomeItemDto {
  @ApiProperty()
  vehicleRecordId!: string;

  @ApiProperty()
  vehicleReferenceNumber!: string;

  @ApiProperty({ description: "Registration lifecycle status, or 'UNKNOWN'" })
  registrationStatus!: string;

  @ApiProperty({ type: String, nullable: true })
  expiresAt!: string | null;

  @ApiProperty({ description: "Latest inspection result code, or 'UNKNOWN'" })
  inspectionStatus!: string;

  @ApiProperty({ type: String, nullable: true })
  lastInspectionAt!: string | null;
}

export class CitizenScheduledDriverTestDto {
  @ApiProperty()
  testReference!: string;

  @ApiProperty({ enum: DriverTestRecordOutcome })
  outcome!: DriverTestRecordOutcome;

  @ApiProperty({ type: String, nullable: true })
  appointmentReference!: string | null;

  @ApiProperty({ type: String, nullable: true })
  scheduledStartsAt!: string | null;
}

export class CitizenPendingVehicleTransferDto {
  @ApiProperty()
  transferReference!: string;

  @ApiProperty()
  decisionRequired!: boolean;
}

export class CitizenTransportationHomeResponseDto {
  @ApiProperty()
  generatedAt!: string;

  @ApiProperty()
  ruleEnvironment!: string;

  @ApiProperty()
  disclaimer!: string;

  @ApiProperty({ type: () => CitizenDriverLicenseSummaryDto, nullable: true })
  driverLicense!: CitizenDriverLicenseSummaryDto | null;

  @ApiProperty({ type: () => [CitizenVehicleHomeItemDto] })
  vehicles!: CitizenVehicleHomeItemDto[];

  @ApiProperty({ type: () => [CitizenScheduledDriverTestDto] })
  scheduledTests!: CitizenScheduledDriverTestDto[];

  @ApiProperty({ type: () => [CitizenPendingVehicleTransferDto] })
  pendingTransfers!: CitizenPendingVehicleTransferDto[];

  @ApiProperty({
    type: 'array',
    items: {},
    description: 'Transportation payments are not yet projected; always an empty list',
  })
  payments!: never[];

  @ApiProperty({
    type: 'array',
    items: {},
    description: 'Transportation messages are not yet projected; always an empty list',
  })
  governmentMessages!: never[];

  @ApiProperty()
  renewalActionsAvailable!: boolean;
}

export class CitizenVehicleItemDto {
  @ApiProperty()
  vehicleRecordId!: string;

  @ApiProperty()
  vehicleReferenceNumber!: string;

  @ApiProperty({ description: "Registration lifecycle status, or 'UNKNOWN'" })
  registrationStatus!: string;
}

export class CitizenVehicleApplicationItemDto {
  @ApiProperty()
  caseId!: string;

  @ApiProperty({ description: 'Case reference number shown to the applicant' })
  caseReference!: string;

  @ApiProperty({ enum: CaseStatus })
  caseStatus!: CaseStatus;

  @ApiProperty()
  applicationId!: string;

  @ApiProperty({ type: String, nullable: true })
  applicationNumber!: string | null;

  @ApiProperty()
  serviceCode!: string;

  @ApiProperty({ description: 'Public name of the government service (display name)' })
  serviceName!: string;
}

export class CitizenTransportationActionDto {
  @ApiProperty()
  actionCode!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty({ description: 'HIGH, MEDIUM or LOW' })
  priority!: string;
}

export class CitizenTransportationActionsResponseDto {
  @ApiProperty()
  generatedAt!: string;

  @ApiProperty({ type: () => [CitizenTransportationActionDto] })
  actions!: CitizenTransportationActionDto[];
}
