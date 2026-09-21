import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateServiceAppointmentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  institutionId!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  governmentServiceId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  applicationId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  caseId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  appointmentReasonId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  appointmentSlotId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  appointmentLocationId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  assignedResourceId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  assignedOfficialIdentityId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  assignedOfficialOfficeholderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledStartsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledEndsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isVirtual?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  virtualMeetingUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  operationalNotes?: string;

  @ApiProperty({
    format: 'uuid',
    description: 'Primary applicant participant identity (server-validated)',
  })
  @IsUUID()
  primaryParticipantIdentityId!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  representativeOrganizationId?: string;
}
