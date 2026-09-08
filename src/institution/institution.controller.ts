import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CreateInstitutionDto } from './dto/create-institution.dto';
import { InstitutionResponseDto } from './dto/institution-response.dto';
import { ListInstitutionsQueryDto } from './dto/list-institutions-query.dto';
import { UpdateInstitutionDto } from './dto/update-institution.dto';
import { InstitutionService } from './institution.service';

@ApiTags('institutions')
@Controller('institutions')
export class InstitutionController {
  constructor(private readonly institutionService: InstitutionService) {}

  @Post()
  @ApiOperation({ summary: 'Create an institution' })
  @ApiCreatedResponse({ type: InstitutionResponseDto })
  create(@Body() dto: CreateInstitutionDto): Promise<InstitutionResponseDto> {
    return this.institutionService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List institutions' })
  @ApiOkResponse({ type: InstitutionResponseDto, isArray: true })
  findAll(@Query() query: ListInstitutionsQueryDto): Promise<InstitutionResponseDto[]> {
    return this.institutionService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an institution by id' })
  @ApiOkResponse({ type: InstitutionResponseDto })
  findById(@Param('id') id: string): Promise<InstitutionResponseDto> {
    return this.institutionService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an institution' })
  @ApiOkResponse({ type: InstitutionResponseDto })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateInstitutionDto,
  ): Promise<InstitutionResponseDto> {
    return this.institutionService.update(id, dto);
  }
}
