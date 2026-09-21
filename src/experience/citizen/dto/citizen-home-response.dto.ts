import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { InstitutionAttributionDto } from '../../common/dto/institution-attribution.dto';
import { LocalizedLabelDto } from '../../common/dto/localized-label.dto';

export class CitizenHomeCountSummaryDto {
  @ApiProperty()
  activeApplications!: number;

  @ApiProperty()
  actionRequired!: number;

  @ApiProperty()
  pendingGovernmentRequests!: number;

  @ApiProperty()
  recentDecisions!: number;

  @ApiProperty()
  issuedCredentials!: number;

  @ApiProperty()
  outstandingPayments!: number;

  @ApiProperty()
  upcomingExpirations!: number;

  @ApiProperty()
  unreadMessages!: number;

  @ApiProperty()
  appealsRedressMatters!: number;
}

export class CitizenHomeRecentItemDto {
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

export class CitizenServiceRecommendationDto {
  @ApiProperty()
  serviceId!: string;

  @ApiProperty()
  serviceSlug!: string;

  @ApiProperty()
  publicName!: string;

  @ApiProperty({ type: LocalizedLabelDto })
  recommendationReason!: LocalizedLabelDto;
}

export class CitizenHomeResponseDto {
  @ApiProperty({ type: CitizenHomeCountSummaryDto })
  counts!: CitizenHomeCountSummaryDto;

  @ApiProperty({ type: [CitizenHomeRecentItemDto] })
  recentItems!: CitizenHomeRecentItemDto[];

  @ApiProperty({ type: [CitizenServiceRecommendationDto] })
  serviceRecommendations!: CitizenServiceRecommendationDto[];

  @ApiProperty({ type: LocalizedLabelDto })
  disclaimer!: LocalizedLabelDto;
}
