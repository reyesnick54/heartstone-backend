import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JurisdictionType, StructuralLifecycleStatus } from '@prisma/client';

export class JurisdictionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'US-FED' })
  code!: string;

  @ApiProperty({ example: 'United States Federal Government' })
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty({ enum: JurisdictionType })
  type!: JurisdictionType;

  @ApiProperty({ enum: StructuralLifecycleStatus })
  status!: StructuralLifecycleStatus;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
