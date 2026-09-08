import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { RecordStatus } from '../../common/enums/record-status.enum';

export class InstitutionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  jurisdictionId!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty({ enum: RecordStatus })
  status!: RecordStatus;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
