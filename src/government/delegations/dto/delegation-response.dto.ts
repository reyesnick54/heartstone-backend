import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DelegationStatus } from '@prisma/client';

export class DelegationResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  institutionId!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  delegatorOfficeId!: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  delegatorOfficeholderId!: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  recipientOfficeId!: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  recipientOfficeholderId!: string | null;

  @ApiProperty()
  scopeDescription!: string;

  @ApiProperty({ enum: DelegationStatus })
  status!: DelegationStatus;

  @ApiProperty()
  effectiveFrom!: Date;

  @ApiPropertyOptional({ nullable: true })
  effectiveUntil!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
