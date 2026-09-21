import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { LocalizedLabelDto } from '../../common/dto/localized-label.dto';

export class BusinessOrganizationSummaryDto {
  @ApiProperty()
  organizationId!: string;

  @ApiProperty()
  organizationCode!: string;

  @ApiProperty()
  organizationName!: string;

  @ApiProperty()
  organizationStatus!: string;

  @ApiProperty({ type: [String], example: ['MEMBERSHIP', 'REPRESENTATIVE_AUTHORITY'] })
  accessPaths!: string[];

  @ApiPropertyOptional()
  membershipRoleLabel?: string | null;

  @ApiPropertyOptional()
  representativeScopeDescription?: string | null;
}

export class BusinessOrganizationsResponseDto {
  @ApiProperty({ type: [BusinessOrganizationSummaryDto] })
  items!: BusinessOrganizationSummaryDto[];

  @ApiProperty({ type: LocalizedLabelDto })
  disclaimer!: LocalizedLabelDto;
}

export class BusinessOrganizationDetailDto {
  @ApiProperty()
  organizationId!: string;

  @ApiProperty()
  organizationCode!: string;

  @ApiProperty()
  organizationName!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty()
  organizationStatus!: string;

  @ApiProperty({ type: [String] })
  accessPaths!: string[];

  @ApiPropertyOptional()
  membershipRoleLabel?: string | null;

  @ApiPropertyOptional()
  representativeScopeDescription?: string | null;

  @ApiProperty()
  registrationStatusLabel!: string;

  @ApiProperty({ type: LocalizedLabelDto })
  disclaimer!: LocalizedLabelDto;
}
