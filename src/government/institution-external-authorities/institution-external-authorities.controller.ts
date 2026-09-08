import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CreateInstitutionExternalAuthorityDto } from './dto/create-institution-external-authority.dto';
import { InstitutionExternalAuthorityResponseDto } from './dto/institution-external-authority-response.dto';
import { QueryInstitutionExternalAuthoritiesDto } from './dto/query-institution-external-authorities.dto';
import { UpdateInstitutionExternalAuthorityDto } from './dto/update-institution-external-authority.dto';
import { InstitutionExternalAuthoritiesService } from './institution-external-authorities.service';

@ApiTags('institution-external-authorities')
@Controller('institution-external-authorities')
export class InstitutionExternalAuthoritiesController {
  constructor(private readonly service: InstitutionExternalAuthoritiesService) {}

  @Post()
  @ApiOperation({ summary: 'Link an institution to an external authority' })
  @ApiCreatedResponse({ type: InstitutionExternalAuthorityResponseDto })
  create(
    @Body() dto: CreateInstitutionExternalAuthorityDto,
  ): Promise<InstitutionExternalAuthorityResponseDto> {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List institution external authority relationships' })
  @ApiOkResponse({ type: InstitutionExternalAuthorityResponseDto, isArray: true })
  findAll(
    @Query() query: QueryInstitutionExternalAuthoritiesDto,
  ): Promise<InstitutionExternalAuthorityResponseDto[]> {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an institution external authority relationship by id' })
  @ApiOkResponse({ type: InstitutionExternalAuthorityResponseDto })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<InstitutionExternalAuthorityResponseDto> {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an institution external authority relationship' })
  @ApiOkResponse({ type: InstitutionExternalAuthorityResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInstitutionExternalAuthorityDto,
  ): Promise<InstitutionExternalAuthorityResponseDto> {
    return this.service.update(id, dto);
  }
}
