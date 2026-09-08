import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentStatus, AppointmentType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAppointmentDto {
  @ApiProperty({ example: 'clxyz123office456' })
  @IsString()
  @IsNotEmpty()
  officeId!: string;

  @ApiProperty({ example: 'clxyz123holder789' })
  @IsString()
  @IsNotEmpty()
  officeholderId!: string;

  @ApiProperty({ example: 'APPT-2026-001' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  referenceCode!: string;

  @ApiProperty({ enum: AppointmentType, example: AppointmentType.PERMANENT })
  @IsEnum(AppointmentType)
  appointmentType!: AppointmentType;

  @ApiProperty({ enum: AppointmentStatus, example: AppointmentStatus.ACTIVE })
  @IsEnum(AppointmentStatus)
  status!: AppointmentStatus;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  @Type(() => Date)
  @IsDate()
  effectiveFrom!: Date;

  @ApiPropertyOptional({ example: '2028-12-31T23:59:59.999Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  effectiveUntil?: Date;

  @ApiPropertyOptional({ example: 'Instrument 12/2026' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  instrumentReference?: string;

  @ApiPropertyOptional({ example: 'Initial appointment to the office.' })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string;
}
