import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExternalAuthorityType, RecordStatus } from '@prisma/client';

export class ExternalAuthorityResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty({ enum: ExternalAuthorityType })
  type!: ExternalAuthorityType;

  @ApiPropertyOptional({ nullable: true })
  jurisdictionDescription!: string | null;

  @ApiProperty({ enum: RecordStatus })
  status!: RecordStatus;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
