import { ApiProperty } from '@nestjs/swagger';

export class OfficialAlertItemDto {
  @ApiProperty({ format: 'uuid' })
  alertId!: string;

  @ApiProperty()
  alertNumber!: string;

  @ApiProperty()
  observedCondition!: string;

  @ApiProperty()
  observedAt!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  recommendedReview!: string;

  @ApiProperty()
  isEmergency!: boolean;

  @ApiProperty()
  isEnforcement!: boolean;

  @ApiProperty()
  actionRoute!: string;
}

export class OfficialAlertsResponseDto {
  @ApiProperty()
  generatedAt!: string;

  @ApiProperty({ type: [OfficialAlertItemDto] })
  items!: OfficialAlertItemDto[];

  @ApiProperty()
  totalCount!: number;
}
