import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AppointmentStatus,
  ExternalAuthorityType,
  GovernmentBodyType,
  InstitutionType,
  JurisdictionType,
  StructuralLifecycleStatus,
} from '@prisma/client';

export class StructureJurisdictionSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: JurisdictionType })
  type!: JurisdictionType;

  @ApiProperty({ enum: StructuralLifecycleStatus })
  status!: StructuralLifecycleStatus;
}

export class StructureGovernmentBodyDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: GovernmentBodyType })
  type!: GovernmentBodyType;

  @ApiProperty({ enum: StructuralLifecycleStatus })
  status!: StructuralLifecycleStatus;
}

export class StructureOfficeholderDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: StructuralLifecycleStatus })
  status!: StructuralLifecycleStatus;
}

export class StructureAppointmentDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: AppointmentStatus })
  status!: AppointmentStatus;

  @ApiProperty()
  effectiveFrom!: Date;

  @ApiPropertyOptional({ nullable: true })
  effectiveUntil!: Date | null;

  @ApiPropertyOptional({ type: StructureOfficeholderDto, nullable: true })
  officeholder!: StructureOfficeholderDto | null;
}

export class StructureOfficeDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: StructuralLifecycleStatus })
  status!: StructuralLifecycleStatus;

  @ApiPropertyOptional({ type: StructureAppointmentDto, nullable: true })
  currentAppointment!: StructureAppointmentDto | null;
}

export class StructureDepartmentDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: StructuralLifecycleStatus })
  status!: StructuralLifecycleStatus;

  @ApiProperty({ type: [StructureOfficeDto] })
  offices!: StructureOfficeDto[];
}

export class StructureExternalAuthorityDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: ExternalAuthorityType })
  type!: ExternalAuthorityType;

  @ApiProperty({ enum: StructuralLifecycleStatus })
  status!: StructuralLifecycleStatus;

  @ApiPropertyOptional({ nullable: true })
  relationshipLabel!: string | null;

  @ApiPropertyOptional({ nullable: true })
  effectiveFrom!: Date | null;

  @ApiPropertyOptional({ nullable: true })
  effectiveUntil!: Date | null;
}

export class StructureInstitutionSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  jurisdictionId!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: InstitutionType })
  type!: InstitutionType;

  @ApiProperty({ enum: StructuralLifecycleStatus })
  status!: StructuralLifecycleStatus;
}

export class InstitutionStructureDto extends StructureInstitutionSummaryDto {
  @ApiProperty({ type: [StructureGovernmentBodyDto] })
  governmentBodies!: StructureGovernmentBodyDto[];

  @ApiProperty({ type: [StructureDepartmentDto] })
  departments!: StructureDepartmentDto[];

  @ApiProperty({ type: [StructureExternalAuthorityDto] })
  externalAuthorities!: StructureExternalAuthorityDto[];
}

export class JurisdictionStructureDto {
  @ApiProperty({ type: StructureJurisdictionSummaryDto })
  jurisdiction!: StructureJurisdictionSummaryDto;

  @ApiProperty({ type: [InstitutionStructureDto] })
  institutions!: InstitutionStructureDto[];
}
