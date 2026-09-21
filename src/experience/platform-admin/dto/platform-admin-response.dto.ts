import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PlatformAdminDisclaimerDto {
  @ApiProperty()
  authorityDisclaimer!: string;

  @ApiProperty()
  configurationDisclaimer!: string;

  @ApiProperty({ example: false })
  hasSubstantiveGovernmentAuthority!: false;
}

export class PlatformAdminCountSummaryDto {
  @ApiProperty()
  label!: string;

  @ApiProperty()
  count!: number;

  @ApiPropertyOptional()
  status?: string;
}

export class PlatformAdminHomeResponseDto extends PlatformAdminDisclaimerDto {
  @ApiProperty()
  identityId!: string;

  @ApiProperty()
  displayName!: string;

  @ApiProperty({ type: [PlatformAdminCountSummaryDto] })
  summaryCounts!: PlatformAdminCountSummaryDto[];

  @ApiProperty({ type: [PlatformAdminCountSummaryDto] })
  operationalAlerts!: PlatformAdminCountSummaryDto[];

  @ApiProperty({ type: [PlatformAdminCountSummaryDto] })
  systemDependencies!: PlatformAdminCountSummaryDto[];

  @ApiProperty({ type: [PlatformAdminCountSummaryDto] })
  productionReadinessConditions!: PlatformAdminCountSummaryDto[];
}

export class PlatformAdminListItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  status?: string;

  @ApiPropertyOptional()
  institutionName?: string;

  @ApiPropertyOptional()
  departmentName?: string;

  @ApiPropertyOptional({ description: 'Administrative attention signal; not legal status' })
  attentionSignal?: string;
}

export class PlatformAdminListResponseDto extends PlatformAdminDisclaimerDto {
  @ApiProperty({ type: [PlatformAdminListItemDto] })
  items!: PlatformAdminListItemDto[];

  @ApiProperty()
  totalCount!: number;
}

export class PlatformAdminAvailableActionDto {
  @ApiProperty()
  actionKey!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  isConsequential!: boolean;

  @ApiProperty()
  executionRoute!: string;

  @ApiProperty({ description: 'When true, action requires governed workflow rather than direct mutation' })
  requiresGovernedWorkflow!: boolean;
}

export class PlatformAdminAvailableActionsResponseDto extends PlatformAdminDisclaimerDto {
  @ApiProperty({ type: [PlatformAdminAvailableActionDto] })
  actions!: PlatformAdminAvailableActionDto[];
}
