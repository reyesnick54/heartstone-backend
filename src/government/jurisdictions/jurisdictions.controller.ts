import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JurisdictionStructureDto } from '../structure/dto/government-structure.dto';
import { GovernmentStructureService } from '../structure/government-structure.service';
import { CreateJurisdictionDto } from './dto/create-jurisdiction.dto';
import { JurisdictionResponseDto } from './dto/jurisdiction-response.dto';
import { QueryJurisdictionsDto } from './dto/query-jurisdictions.dto';
import { UpdateJurisdictionDto } from './dto/update-jurisdiction.dto';
import { JurisdictionsService } from './jurisdictions.service';

@ApiTags('jurisdictions')
@Controller('jurisdictions')
export class JurisdictionsController {
  constructor(
    private readonly jurisdictionsService: JurisdictionsService,
    private readonly structureService: GovernmentStructureService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a jurisdiction' })
  @ApiCreatedResponse({ type: JurisdictionResponseDto })
  create(@Body() dto: CreateJurisdictionDto): Promise<JurisdictionResponseDto> {
    return this.jurisdictionsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List jurisdictions' })
  @ApiOkResponse({ type: JurisdictionResponseDto, isArray: true })
  findAll(@Query() query: QueryJurisdictionsDto): Promise<JurisdictionResponseDto[]> {
    return this.jurisdictionsService.findAll(query);
  }

  @Get(':id/structure')
  @ApiOperation({ summary: 'Get organizational structure for a jurisdiction' })
  @ApiOkResponse({ type: JurisdictionStructureDto })
  getStructure(@Param('id', ParseUUIDPipe) id: string): Promise<JurisdictionStructureDto> {
    return this.structureService.getJurisdictionStructure(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a jurisdiction by id' })
  @ApiOkResponse({ type: JurisdictionResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<JurisdictionResponseDto> {
    return this.jurisdictionsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a jurisdiction' })
  @ApiOkResponse({ type: JurisdictionResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateJurisdictionDto,
  ): Promise<JurisdictionResponseDto> {
    return this.jurisdictionsService.update(id, dto);
  }
}
