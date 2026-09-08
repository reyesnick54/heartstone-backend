import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CreateInstitutionExternalAuthorityDto } from './dto/create-institution-external-authority.dto';
import { InstitutionExternalAuthorityResponseDto } from './dto/institution-external-authority-response.dto';
import { ListInstitutionExternalAuthoritiesQueryDto } from './dto/list-institution-external-authorities-query.dto';
import { UpdateInstitutionExternalAuthorityDto } from './dto/update-institution-external-authority.dto';
import { InstitutionExternalAuthorityService } from './institution-external-authority.service';

@ApiTags('institution-external-authorities')
@Controller('institution-external-authorities')
export class InstitutionExternalAuthorityController {
  constructor(
    private readonly institutionExternalAuthorityService: InstitutionExternalAuthorityService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create an institution to external authority relationship',
  })
  @ApiCreatedResponse({ type: InstitutionExternalAuthorityResponseDto })
  create(
    @Body() dto: CreateInstitutionExternalAuthorityDto,
  ): Promise<InstitutionExternalAuthorityResponseDto> {
    return this.institutionExternalAuthorityService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary:
      'List institution to external authority relationships by institution or external authority',
  })
  @ApiOkResponse({
    type: InstitutionExternalAuthorityResponseDto,
    isArray: true,
  })
  findAll(
    @Query() query: ListInstitutionExternalAuthoritiesQueryDto,
  ): Promise<InstitutionExternalAuthorityResponseDto[]> {
    return this.institutionExternalAuthorityService.findAll(query);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update an institution to external authority relationship',
  })
  @ApiOkResponse({ type: InstitutionExternalAuthorityResponseDto })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateInstitutionExternalAuthorityDto,
  ): Promise<InstitutionExternalAuthorityResponseDto> {
    return this.institutionExternalAuthorityService.update(id, dto);
  }
}
