import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';

export class CreateAppointmentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  officeId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  officeholderId!: string;

  @ApiPropertyOptional({ enum: AppointmentStatus, default: AppointmentStatus.PENDING })
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @ApiProperty()
  @IsDateString()
  effectiveFrom!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveUntil?: string;
}
