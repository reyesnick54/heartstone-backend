import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StructuralLifecycleStatus } from '@prisma/client';

export class DecisionTypeResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty({ format: 'uuid' })
  responsibleInstitutionId!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  responsibleDepartmentId?: string | null;

  @ApiProperty({ enum: StructuralLifecycleStatus })
  status!: StructuralLifecycleStatus;

  @ApiPropertyOptional({ format: 'uuid' })
  governingSourceId?: string | null;

  @ApiPropertyOptional({ format: 'uuid' })
  governmentServiceId?: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
