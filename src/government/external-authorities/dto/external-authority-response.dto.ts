import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExternalAuthorityType, StructuralLifecycleStatus } from '@prisma/client';

export class ExternalAuthorityResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty({ enum: ExternalAuthorityType })
  type!: ExternalAuthorityType;

  @ApiProperty({ enum: StructuralLifecycleStatus })
  status!: StructuralLifecycleStatus;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
