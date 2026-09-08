import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { GovernmentBodyType } from '../../common/enums/government-body-type.enum';
import { RecordStatus } from '../../common/enums/record-status.enum';

export class GovernmentBodyResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  institutionId!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty({ enum: GovernmentBodyType })
  type!: GovernmentBodyType;

  @ApiProperty({ enum: RecordStatus })
  status!: RecordStatus;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
