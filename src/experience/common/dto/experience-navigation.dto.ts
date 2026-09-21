import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { LocalizedLabelDto } from './localized-label.dto';

export class ExperienceNavigationItemDto {
  @ApiProperty()
  key!: string;

  @ApiProperty({ type: LocalizedLabelDto })
  label!: LocalizedLabelDto;

  @ApiProperty()
  route!: string;

  @ApiPropertyOptional()
  iconKey?: string;

  @ApiProperty()
  accessible!: boolean;
}

export class ExperienceNavigationResponseDto {
  @ApiProperty()
  persona!: string;

  @ApiProperty({ type: [ExperienceNavigationItemDto] })
  items!: ExperienceNavigationItemDto[];

  @ApiProperty()
  navigationDisclaimer!: string;
}
