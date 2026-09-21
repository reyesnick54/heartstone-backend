import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { DepartmentMetricsFreshnessDto } from './department-common.dto';

class DepartmentOfficerAppointmentDto {
  @ApiProperty({ format: 'uuid' })
  appointmentId!: string;

  @ApiProperty({ format: 'uuid' })
  officeId!: string;

  @ApiProperty()
  officeName!: string;

  @ApiProperty()
  officeCode!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  effectiveFrom!: string;

  @ApiProperty({ nullable: true })
  effectiveUntil!: string | null;
}

class DepartmentOfficerUnavailableContextDto {
  @ApiProperty()
  reason!: string;

  @ApiProperty({ format: 'uuid' })
  functionAuthorityRecordId!: string;
}

class DepartmentOfficerItemDto {
  @ApiProperty({ format: 'uuid' })
  officeholderId!: string;

  @ApiProperty()
  officeholderName!: string;

  @ApiProperty()
  officeholderCode!: string;

  @ApiProperty({ type: DepartmentOfficerAppointmentDto })
  currentAppointment!: DepartmentOfficerAppointmentDto;

  @ApiProperty()
  activeAssignmentCount!: number;

  @ApiProperty()
  slaRiskAssignments!: number;

  @ApiProperty()
  pendingReviews!: number;

  @ApiPropertyOptional({ type: DepartmentOfficerUnavailableContextDto, nullable: true })
  unavailableContext!: DepartmentOfficerUnavailableContextDto | null;
}

export class DepartmentOfficersResponseDto {
  @ApiProperty()
  generatedAt!: string;

  @ApiProperty({ format: 'uuid' })
  departmentId!: string;

  @ApiProperty()
  departmentName!: string;

  @ApiProperty({ type: [DepartmentOfficerItemDto] })
  items!: DepartmentOfficerItemDto[];

  @ApiProperty()
  restrictedHrFieldsExcluded!: boolean;

  @ApiProperty({ type: DepartmentMetricsFreshnessDto })
  metricsFreshness!: DepartmentMetricsFreshnessDto;

  @ApiProperty()
  authorityDisclaimer!: string;
}
