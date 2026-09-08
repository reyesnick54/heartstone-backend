import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentStatus } from '@prisma/client';

export class AppointmentResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  officeId!: string;

  @ApiProperty({ format: 'uuid' })
  officeholderId!: string;

  @ApiProperty({ enum: AppointmentStatus })
  status!: AppointmentStatus;

  @ApiProperty()
  effectiveFrom!: Date;

  @ApiPropertyOptional({ nullable: true })
  effectiveUntil!: Date | null;

  @ApiProperty()
  isCurrent!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
