import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ServicePackResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiPropertyOptional({ format: 'uuid' })
  jurisdictionId?: string | null;

  @ApiPropertyOptional({ format: 'uuid' })
  institutionId?: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
