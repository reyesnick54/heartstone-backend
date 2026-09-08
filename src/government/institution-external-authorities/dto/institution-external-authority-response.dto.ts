import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StructuralLifecycleStatus } from '@prisma/client';

export class InstitutionExternalAuthorityResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  institutionId!: string;

  @ApiProperty({ format: 'uuid' })
  externalAuthorityId!: string;

  @ApiPropertyOptional({ nullable: true })
  relationshipLabel!: string | null;

  @ApiProperty({ enum: StructuralLifecycleStatus })
  status!: StructuralLifecycleStatus;

  @ApiPropertyOptional({ nullable: true })
  effectiveFrom!: Date | null;

  @ApiPropertyOptional({ nullable: true })
  effectiveUntil!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
