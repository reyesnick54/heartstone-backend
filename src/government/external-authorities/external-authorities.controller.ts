import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CreateExternalAuthorityDto } from './dto/create-external-authority.dto';
import { ExternalAuthorityResponseDto } from './dto/external-authority-response.dto';
import { QueryExternalAuthoritiesDto } from './dto/query-external-authorities.dto';
import { UpdateExternalAuthorityDto } from './dto/update-external-authority.dto';
import { ExternalAuthoritiesService } from './external-authorities.service';

@ApiTags('external-authorities')
@Controller('external-authorities')
export class ExternalAuthoritiesController {
  constructor(private readonly service: ExternalAuthoritiesService) {}

  @Post()
  @ApiOperation({ summary: 'Create an external authority' })
  @ApiCreatedResponse({ type: ExternalAuthorityResponseDto })
  create(@Body() dto: CreateExternalAuthorityDto): Promise<ExternalAuthorityResponseDto> {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List external authorities' })
  @ApiOkResponse({ type: ExternalAuthorityResponseDto, isArray: true })
  findAll(@Query() query: QueryExternalAuthoritiesDto): Promise<ExternalAuthorityResponseDto[]> {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an external authority by id' })
  @ApiOkResponse({ type: ExternalAuthorityResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ExternalAuthorityResponseDto> {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an external authority' })
  @ApiOkResponse({ type: ExternalAuthorityResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExternalAuthorityDto,
  ): Promise<ExternalAuthorityResponseDto> {
    return this.service.update(id, dto);
  }
}
