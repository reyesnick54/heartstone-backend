import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CreateInstitutionDto } from './dto/create-institution.dto';
import { InstitutionResponseDto } from './dto/institution-response.dto';
import { QueryInstitutionsDto } from './dto/query-institutions.dto';
import { UpdateInstitutionDto } from './dto/update-institution.dto';
import { InstitutionsService } from './institutions.service';

@ApiTags('institutions')
@Controller('institutions')
export class InstitutionsController {
  constructor(private readonly institutionsService: InstitutionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create an institution' })
  @ApiCreatedResponse({ type: InstitutionResponseDto })
  create(@Body() dto: CreateInstitutionDto): Promise<InstitutionResponseDto> {
    return this.institutionsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List institutions' })
  @ApiOkResponse({ type: InstitutionResponseDto, isArray: true })
  findAll(@Query() query: QueryInstitutionsDto): Promise<InstitutionResponseDto[]> {
    return this.institutionsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an institution by id' })
  @ApiOkResponse({ type: InstitutionResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<InstitutionResponseDto> {
    return this.institutionsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an institution' })
  @ApiOkResponse({ type: InstitutionResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInstitutionDto,
  ): Promise<InstitutionResponseDto> {
    return this.institutionsService.update(id, dto);
  }
}
