import { ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentStatus, AppointmentType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAppointmentDto {
  @ApiPropertyOptional({ enum: AppointmentType })
  @IsOptional()
  @IsEnum(AppointmentType)
  appointmentType?: AppointmentType;

  @ApiPropertyOptional({ enum: AppointmentStatus })
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @ApiPropertyOptional({ example: '2026-01-01T00:00:00.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  effectiveFrom?: Date;

  @ApiPropertyOptional({ example: '2028-12-31T23:59:59.999Z', nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  effectiveUntil?: Date | null;

  @ApiPropertyOptional({ example: 'Instrument 12/2026', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  instrumentReference?: string | null;

  @ApiPropertyOptional({ example: 'Updated appointment notes.', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string | null;
}
