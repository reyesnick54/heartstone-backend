import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { DeepLinkDto } from '../../common/dto/deep-link.dto';
import { InstitutionAttributionDto } from '../../common/dto/institution-attribution.dto';
import { LocalizedLabelDto } from '../../common/dto/localized-label.dto';

export class CitizenCaseMilestoneDto {
  @ApiProperty()
  milestoneId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional()
  reachedAt?: string;
}

export class CitizenCaseCommunicationSummaryDto {
  @ApiProperty()
  communicationId!: string;

  @ApiProperty()
  communicationType!: string;

  @ApiPropertyOptional()
  subject?: string;

  @ApiProperty()
  sentAt!: string;
}

export class CitizenCaseStatusResponseDto {
  @ApiProperty()
  caseId!: string;

  @ApiProperty()
  caseNumber!: string;

  @ApiProperty()
  publicStatusLabel!: string;

  @ApiProperty()
  publicStageLabel!: string;

  @ApiPropertyOptional()
  publicMessage?: string;

  @ApiProperty({ type: LocalizedLabelDto })
  applicantDisclaimer!: LocalizedLabelDto;

  @ApiProperty({ type: InstitutionAttributionDto })
  attribution!: InstitutionAttributionDto;

  @ApiProperty({ type: [CitizenCaseMilestoneDto] })
  milestones!: CitizenCaseMilestoneDto[];

  @ApiProperty({ type: [CitizenCaseCommunicationSummaryDto] })
  recentCommunications!: CitizenCaseCommunicationSummaryDto[];

  @ApiProperty({ type: DeepLinkDto })
  deepLink!: DeepLinkDto;
}
