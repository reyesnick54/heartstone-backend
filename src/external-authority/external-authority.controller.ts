import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CreateExternalAuthorityDto } from './dto/create-external-authority.dto';
import { ExternalAuthorityResponseDto } from './dto/external-authority-response.dto';
import { ListExternalAuthoritiesQueryDto } from './dto/list-external-authorities-query.dto';
import { UpdateExternalAuthorityDto } from './dto/update-external-authority.dto';
import { ExternalAuthorityService } from './external-authority.service';

@ApiTags('external-authorities')
@Controller('external-authorities')
export class ExternalAuthorityController {
  constructor(private readonly externalAuthorityService: ExternalAuthorityService) {}

  @Post()
  @ApiOperation({ summary: 'Create an external authority record' })
  @ApiCreatedResponse({ type: ExternalAuthorityResponseDto })
  create(@Body() dto: CreateExternalAuthorityDto): Promise<ExternalAuthorityResponseDto> {
    return this.externalAuthorityService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List external authority records' })
  @ApiOkResponse({ type: ExternalAuthorityResponseDto, isArray: true })
  findAll(
    @Query() query: ListExternalAuthoritiesQueryDto,
  ): Promise<ExternalAuthorityResponseDto[]> {
    return this.externalAuthorityService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an external authority record by id' })
  @ApiOkResponse({ type: ExternalAuthorityResponseDto })
  findById(@Param('id') id: string): Promise<ExternalAuthorityResponseDto> {
    return this.externalAuthorityService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an external authority record' })
  @ApiOkResponse({ type: ExternalAuthorityResponseDto })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateExternalAuthorityDto,
  ): Promise<ExternalAuthorityResponseDto> {
    return this.externalAuthorityService.update(id, dto);
  }
}
