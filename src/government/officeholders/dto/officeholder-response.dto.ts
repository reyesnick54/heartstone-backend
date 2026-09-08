import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StructuralLifecycleStatus } from '@prisma/client';

export class OfficeholderResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;

  @ApiProperty() code!: string;

  @ApiProperty() name!: string;

  @ApiPropertyOptional({ nullable: true }) description!: string | null;

  @ApiProperty({ enum: StructuralLifecycleStatus }) status!: StructuralLifecycleStatus;

  @ApiProperty() createdAt!: Date;

  @ApiProperty() updatedAt!: Date;
}
