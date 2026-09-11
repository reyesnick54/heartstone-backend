import { Body, Controller, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CreateRepresentativeAuthorityDto } from './dto/create-representative-authority.dto';
import { RepresentativeAuthorityResponseDto } from './dto/representative-authority-response.dto';
import { RepresentativeAuthoritiesService } from './representative-authorities.service';

@ApiTags('identity-representative-authorities')
@Controller('identity/representative-authorities')
export class RepresentativeAuthoritiesController {
  constructor(
    private readonly representativeAuthoritiesService: RepresentativeAuthoritiesService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create organizational representative authority (not government authority)',
  })
  @ApiCreatedResponse({ type: RepresentativeAuthorityResponseDto })
  create(
    @Body() dto: CreateRepresentativeAuthorityDto,
  ): Promise<RepresentativeAuthorityResponseDto> {
    return this.representativeAuthoritiesService.create(dto);
  }
}
