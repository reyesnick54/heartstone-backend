import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { LocalizedLabelDto } from '../../common/dto/localized-label.dto';
import { PaginationMetaDto } from '../../common/dto/pagination-meta.dto';

export class BusinessProjectMilestoneDto {
  @ApiProperty()
  milestoneId!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  isVerifiedCompletion!: boolean;

  @ApiPropertyOptional()
  plannedDate?: string | null;

  @ApiPropertyOptional()
  reportedDate?: string | null;

  @ApiPropertyOptional()
  verifiedDate?: string | null;
}

export class BusinessProjectDependencyDto {
  @ApiProperty()
  dependencyId!: string;

  @ApiProperty()
  dependencyType!: string;

  @ApiProperty()
  ownerType!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  isResolved!: boolean;
}

export class BusinessProjectItemDto {
  @ApiProperty()
  projectId!: string;

  @ApiProperty()
  projectCode!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  currentStage!: string;

  @ApiProperty()
  reportedStatusIsNotVerifiedCompletion!: boolean;

  @ApiPropertyOptional()
  caseId?: string | null;

  @ApiProperty({ type: [BusinessProjectMilestoneDto] })
  milestones!: BusinessProjectMilestoneDto[];

  @ApiProperty({ type: [BusinessProjectDependencyDto] })
  governmentDependencies!: BusinessProjectDependencyDto[];

  @ApiProperty()
  outstandingEvidenceCount!: number;

  @ApiPropertyOptional()
  statusProjectionDisclaimer?: string | null;
}

export class BusinessProjectsResponseDto {
  @ApiProperty({ type: [BusinessProjectItemDto] })
  items!: BusinessProjectItemDto[];

  @ApiProperty({ type: PaginationMetaDto })
  pagination!: PaginationMetaDto;

  @ApiProperty({ type: LocalizedLabelDto })
  disclaimer!: LocalizedLabelDto;
}
