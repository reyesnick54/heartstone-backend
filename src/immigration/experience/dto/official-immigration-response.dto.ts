import { ApiProperty } from '@nestjs/swagger';

export class OfficialImmigrationQueueMetricDto {
  @ApiProperty()
  queueKey!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  count!: number;
}

export class OfficialImmigrationWorkspaceResponseDto {
  @ApiProperty()
  departmentScopeLabel!: string;

  @ApiProperty()
  disclaimer!: string;

  @ApiProperty({ type: [OfficialImmigrationQueueMetricDto] })
  queues!: OfficialImmigrationQueueMetricDto[];

  @ApiProperty()
  slaRiskCount!: number;

  @ApiProperty()
  unresolvedExternalDeterminationsCount!: number;
}

export class OfficialImmigrationAvailableActionDto {
  @ApiProperty()
  actionKey!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  available!: boolean;

  @ApiProperty({ nullable: true })
  unavailableReason!: string | null;
}

export class OfficialImmigrationAvailableActionsResponseDto {
  @ApiProperty()
  caseId!: string;

  @ApiProperty({ type: [OfficialImmigrationAvailableActionDto] })
  actions!: OfficialImmigrationAvailableActionDto[];
}
