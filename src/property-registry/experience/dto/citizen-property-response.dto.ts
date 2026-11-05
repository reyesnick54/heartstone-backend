import { ApiProperty } from '@nestjs/swagger';
import {
  PropertyCertificateStatus,
  PropertyInterestKind,
  PropertyParcelStatus,
  PropertyRegistryApplicationStatus,
  PropertyRegistryApplicationType,
} from '@prisma/client';

/** Scalar columns of a persisted `PropertyRegistryApplication` row as serialized to JSON. */
export class PropertyRegistryApplicationRecordDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ type: String, nullable: true })
  parcelId!: string | null;

  @ApiProperty({ enum: PropertyRegistryApplicationType })
  applicationType!: PropertyRegistryApplicationType;

  @ApiProperty({ enum: PropertyRegistryApplicationStatus })
  status!: PropertyRegistryApplicationStatus;

  @ApiProperty()
  applicantIdentityId!: string;

  @ApiProperty({ type: String, nullable: true })
  organizationId!: string | null;

  @ApiProperty()
  applicationReference!: string;

  @ApiProperty()
  mayMutateTitle!: boolean;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  submittedAt!: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

export class CitizenPropertyParcelSummaryDto {
  @ApiProperty()
  parcelId!: string;

  @ApiProperty()
  parcelReference!: string;

  @ApiProperty({ enum: PropertyParcelStatus })
  registryStatus!: PropertyParcelStatus;

  @ApiProperty()
  relationshipSummary!: string;
}

export class CitizenPropertyHomeResponseDto {
  @ApiProperty()
  generatedAt!: string;

  @ApiProperty({ enum: ['NON_PRODUCTION'] })
  ruleEnvironment!: 'NON_PRODUCTION';

  @ApiProperty()
  disclaimer!: string;

  @ApiProperty()
  parcelCount!: number;

  @ApiProperty({ type: () => [CitizenPropertyParcelSummaryDto] })
  parcels!: CitizenPropertyParcelSummaryDto[];
}

export class CitizenPropertyInterestItemDto {
  @ApiProperty()
  interestId!: string;

  @ApiProperty()
  parcelReference!: string;

  @ApiProperty({ enum: PropertyInterestKind })
  interestKind!: PropertyInterestKind;

  @ApiProperty({ enum: PropertyParcelStatus })
  registryStatus!: PropertyParcelStatus;

  @ApiProperty()
  titleSummary!: string;
}

export class CitizenPropertyDocumentItemDto {
  @ApiProperty()
  certificateReference!: string;

  @ApiProperty()
  registryVersionNumber!: number;

  @ApiProperty({ enum: PropertyCertificateStatus })
  status!: PropertyCertificateStatus;
}

export class CitizenPropertyActionsResponseDto {
  @ApiProperty()
  pendingApplications!: number;

  @ApiProperty()
  activeEncumbrances!: number;

  @ApiProperty({ type: [String] })
  suggestedActions!: string[];
}
