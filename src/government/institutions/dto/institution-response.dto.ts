import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InstitutionType, StructuralLifecycleStatus } from '@prisma/client';

export class InstitutionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  jurisdictionId!: string;

  @ApiProperty({ example: 'DOT' })
  code!: string;

  @ApiProperty({ example: 'Department of Transportation' })
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty({ enum: InstitutionType })
  type!: InstitutionType;

  @ApiProperty({ enum: StructuralLifecycleStatus })
  status!: StructuralLifecycleStatus;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
