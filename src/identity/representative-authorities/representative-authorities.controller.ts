import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CreateRepresentativeAuthorityDto } from './dto/create-representative-authority.dto';
import { QueryRepresentativeAuthoritiesDto } from './dto/query-representative-authorities.dto';
import { RepresentativeAuthorityResponseDto } from './dto/representative-authority-response.dto';
import { UpdateRepresentativeAuthorityDto } from './dto/update-representative-authority.dto';
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

  @Get()
  @ApiOperation({ summary: 'List representative authorities' })
  @ApiOkResponse({ type: RepresentativeAuthorityResponseDto, isArray: true })
  findAll(
    @Query() query: QueryRepresentativeAuthoritiesDto,
  ): Promise<RepresentativeAuthorityResponseDto[]> {
    return this.representativeAuthoritiesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a representative authority by id' })
  @ApiOkResponse({ type: RepresentativeAuthorityResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<RepresentativeAuthorityResponseDto> {
    return this.representativeAuthoritiesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update representative authority metadata' })
  @ApiOkResponse({ type: RepresentativeAuthorityResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRepresentativeAuthorityDto,
  ): Promise<RepresentativeAuthorityResponseDto> {
    return this.representativeAuthoritiesService.update(id, dto);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Activate a representative authority' })
  @ApiOkResponse({ type: RepresentativeAuthorityResponseDto })
  activate(@Param('id', ParseUUIDPipe) id: string): Promise<RepresentativeAuthorityResponseDto> {
    return this.representativeAuthoritiesService.activate(id);
  }

  @Patch(':id/suspend')
  @ApiOperation({ summary: 'Suspend a representative authority' })
  @ApiOkResponse({ type: RepresentativeAuthorityResponseDto })
  suspend(@Param('id', ParseUUIDPipe) id: string): Promise<RepresentativeAuthorityResponseDto> {
    return this.representativeAuthoritiesService.suspend(id);
  }

  @Patch(':id/revoke')
  @ApiOperation({ summary: 'Revoke a representative authority' })
  @ApiOkResponse({ type: RepresentativeAuthorityResponseDto })
  revoke(@Param('id', ParseUUIDPipe) id: string): Promise<RepresentativeAuthorityResponseDto> {
    return this.representativeAuthoritiesService.revoke(id);
  }

  @Patch(':id/end')
  @ApiOperation({ summary: 'End a representative authority' })
  @ApiOkResponse({ type: RepresentativeAuthorityResponseDto })
  end(@Param('id', ParseUUIDPipe) id: string): Promise<RepresentativeAuthorityResponseDto> {
    return this.representativeAuthoritiesService.end(id);
  }
}
