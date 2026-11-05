import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ExperienceLocalizationMetadataDto {
  @ApiProperty()
  locale!: string;

  @ApiProperty()
  defaultLocale!: string;

  @ApiProperty({
    description:
      'Localization keys are presentation-only and separate from authoritative record content',
  })
  localizationNote!: string;
}

export class ExperienceResponseMetadataDto {
  @ApiProperty()
  generatedAt!: string;

  @ApiProperty({ type: ExperienceLocalizationMetadataDto })
  localization!: ExperienceLocalizationMetadataDto;

  @ApiPropertyOptional()
  persona?: string;

  @ApiProperty()
  authorityDisclaimer!: string;

  @ApiPropertyOptional()
  scopeDisclaimer?: string;
}

export class ExperienceDeepLinkResolveRequestDto {
  @ApiProperty({ description: 'Stable route identifier', example: 'citizen.application.detail' })
  route!: string;

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'string' },
    description: 'Route parameters keyed by parameter name',
  })
  params!: Record<string, string>;
}

export class ExperienceDeepLinkResolveResponseDto {
  @ApiProperty()
  authorized!: boolean;

  @ApiProperty()
  route!: string;

  @ApiProperty({ type: 'object', additionalProperties: { type: 'string' } })
  params!: Record<string, string>;

  @ApiPropertyOptional()
  denialReason?: string;

  @ApiProperty()
  resolutionDisclaimer!: string;
}
