import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentStatus, AppointmentType } from '@prisma/client';

export class AppointmentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  officeId!: string;

  @ApiProperty()
  officeholderId!: string;

  @ApiProperty()
  referenceCode!: string;

  @ApiProperty({ enum: AppointmentType })
  appointmentType!: AppointmentType;

  @ApiProperty({ enum: AppointmentStatus })
  status!: AppointmentStatus;

  @ApiProperty()
  effectiveFrom!: Date;

  @ApiPropertyOptional({ nullable: true })
  effectiveUntil!: Date | null;

  @ApiPropertyOptional({ nullable: true })
  instrumentReference!: string | null;

  @ApiPropertyOptional({ nullable: true })
  notes!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
