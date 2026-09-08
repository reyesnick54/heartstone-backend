import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CreateJurisdictionDto } from './dto/create-jurisdiction.dto';
import { JurisdictionResponseDto } from './dto/jurisdiction-response.dto';
import { ListJurisdictionsQueryDto } from './dto/list-jurisdictions-query.dto';
import { UpdateJurisdictionDto } from './dto/update-jurisdiction.dto';
import { JurisdictionService } from './jurisdiction.service';

@ApiTags('jurisdictions')
@Controller('jurisdictions')
export class JurisdictionController {
  constructor(private readonly jurisdictionService: JurisdictionService) {}

  @Post()
  @ApiOperation({ summary: 'Create a jurisdiction' })
  @ApiCreatedResponse({ type: JurisdictionResponseDto })
  create(@Body() dto: CreateJurisdictionDto): Promise<JurisdictionResponseDto> {
    return this.jurisdictionService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List jurisdictions' })
  @ApiOkResponse({ type: JurisdictionResponseDto, isArray: true })
  findAll(@Query() query: ListJurisdictionsQueryDto): Promise<JurisdictionResponseDto[]> {
    return this.jurisdictionService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a jurisdiction by id' })
  @ApiOkResponse({ type: JurisdictionResponseDto })
  findById(@Param('id') id: string): Promise<JurisdictionResponseDto> {
    return this.jurisdictionService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a jurisdiction' })
  @ApiOkResponse({ type: JurisdictionResponseDto })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateJurisdictionDto,
  ): Promise<JurisdictionResponseDto> {
    return this.jurisdictionService.update(id, dto);
  }
}
