import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { InstitutionAttributionDto } from '../../common/dto/institution-attribution.dto';
import { LocalizedLabelDto } from '../../common/dto/localized-label.dto';

export class BusinessHomeCountSummaryDto {
  @ApiProperty()
  activeApplications!: number;

  @ApiProperty()
  activeLicenses!: number;

  @ApiProperty()
  licensesApproachingExpiry!: number;

  @ApiProperty()
  outstandingActions!: number;

  @ApiProperty()
  outstandingPayments!: number;

  @ApiProperty()
  governmentMessages!: number;

  @ApiProperty()
  complianceObligations!: number;

  @ApiProperty()
  inspectionsAndCorrectiveActions!: number;

  @ApiProperty()
  workforceMatters!: number;

  @ApiProperty()
  propertyAndProjectMatters!: number;

  @ApiProperty()
  customsAndTradeMatters!: number;

  @ApiProperty()
  strategicInvestmentProjects!: number;

  @ApiProperty()
  appealsAndRedress!: number;

  @ApiProperty()
  upcomingDeadlines!: number;
}

export class BusinessHomeRecentItemDto {
  @ApiProperty()
  itemType!: string;

  @ApiProperty()
  itemId!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  occurredAt!: string;

  @ApiPropertyOptional({ type: InstitutionAttributionDto })
  attribution?: InstitutionAttributionDto;
}

export class BusinessHomeResponseDto {
  @ApiProperty()
  organizationId!: string;

  @ApiProperty({ type: BusinessHomeCountSummaryDto })
  counts!: BusinessHomeCountSummaryDto;

  @ApiProperty({ type: [BusinessHomeRecentItemDto] })
  recentItems!: BusinessHomeRecentItemDto[];

  @ApiProperty({ type: LocalizedLabelDto })
  disclaimer!: LocalizedLabelDto;
}
