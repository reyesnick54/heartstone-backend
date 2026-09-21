import { ApiProperty } from '@nestjs/swagger';

class DepartmentMeAppointmentDto {
  @ApiProperty({ format: 'uuid' })
  appointmentId!: string;

  @ApiProperty({ format: 'uuid' })
  officeId!: string;

  @ApiProperty({ format: 'uuid' })
  departmentId!: string;

  @ApiProperty({ format: 'uuid' })
  institutionId!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  effectiveFrom!: string;

  @ApiProperty({ nullable: true })
  effectiveUntil!: string | null;
}

class DepartmentMeDepartmentDto {
  @ApiProperty({ format: 'uuid' })
  departmentId!: string;

  @ApiProperty()
  departmentName!: string;

  @ApiProperty()
  departmentCode!: string;

  @ApiProperty({ format: 'uuid' })
  institutionId!: string;

  @ApiProperty()
  hasManagementAccess!: boolean;

  @ApiProperty()
  hasDepartmentRelationship!: boolean;
}

export class DepartmentMeResponseDto {
  @ApiProperty({ format: 'uuid' })
  identityId!: string;

  @ApiProperty()
  assuranceLevel!: string;

  @ApiProperty({ type: [DepartmentMeAppointmentDto] })
  activeAppointments!: DepartmentMeAppointmentDto[];

  @ApiProperty({ type: [DepartmentMeDepartmentDto] })
  departments!: DepartmentMeDepartmentDto[];

  @ApiProperty()
  hasUniversalAuthority!: boolean;

  @ApiProperty()
  dashboardVisibilityDoesNotCreateAuthority!: boolean;

  @ApiProperty()
  authorityDisclaimer!: string;
}
