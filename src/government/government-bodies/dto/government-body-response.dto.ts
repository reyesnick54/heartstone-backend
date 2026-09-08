import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GovernmentBodyType, StructuralLifecycleStatus } from '@prisma/client';

export class GovernmentBodyResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;

  @ApiProperty({ format: 'uuid' }) institutionId!: string;

  @ApiProperty() code!: string;

  @ApiProperty() name!: string;

  @ApiPropertyOptional({ nullable: true }) description!: string | null;

  @ApiProperty({ enum: GovernmentBodyType }) type!: GovernmentBodyType;

  @ApiProperty({ enum: StructuralLifecycleStatus }) status!: StructuralLifecycleStatus;

  @ApiProperty() createdAt!: Date;

  @ApiProperty() updatedAt!: Date;
}
