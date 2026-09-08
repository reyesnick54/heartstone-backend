import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StructuralLifecycleStatus } from '@prisma/client';

export class OfficeResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;

  @ApiProperty({ format: 'uuid' }) departmentId!: string;

  @ApiProperty() code!: string;

  @ApiProperty() name!: string;

  @ApiPropertyOptional({ nullable: true }) description!: string | null;

  @ApiProperty({ enum: StructuralLifecycleStatus }) status!: StructuralLifecycleStatus;

  @ApiProperty() createdAt!: Date;

  @ApiProperty() updatedAt!: Date;
}
