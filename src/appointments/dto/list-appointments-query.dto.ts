import { ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentStatus, AppointmentType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class ListAppointmentsQueryDto {
  @ApiPropertyOptional({ example: 'clxyz123office456' })
  @IsOptional()
  @IsString()
  officeId?: string;

  @ApiPropertyOptional({ example: 'clxyz123holder789' })
  @IsOptional()
  @IsString()
  officeholderId?: string;

  @ApiPropertyOptional({ enum: AppointmentStatus })
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @ApiPropertyOptional({ enum: AppointmentType })
  @IsOptional()
  @IsEnum(AppointmentType)
  appointmentType?: AppointmentType;
}
