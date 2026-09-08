import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CreateOfficeDto } from './dto/create-office.dto';
import { OfficeResponseDto } from './dto/office-response.dto';
import { QueryOfficesDto } from './dto/query-offices.dto';
import { UpdateOfficeDto } from './dto/update-office.dto';
import { OfficesService } from './offices.service';

@ApiTags('offices')
@Controller('offices')
export class OfficesController {
  constructor(private readonly service: OfficesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a office' })
  @ApiCreatedResponse({ type: OfficeResponseDto })
  create(@Body() dto: CreateOfficeDto): Promise<OfficeResponseDto> {
    return this.service.create(dto);
  constructor(private readonly officesService: OfficesService) {}

  @Post()
  @ApiOperation({ summary: 'Create an office' })
  @ApiCreatedResponse({ type: OfficeResponseDto })
  create(@Body() dto: CreateOfficeDto): Promise<OfficeResponseDto> {
    return this.officesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List offices' })
  @ApiOkResponse({ type: OfficeResponseDto, isArray: true })
  findAll(@Query() query: QueryOfficesDto): Promise<OfficeResponseDto[]> {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a office by id' })
  @ApiOkResponse({ type: OfficeResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<OfficeResponseDto> {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a office' })
    return this.officesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an office by id' })
  @ApiOkResponse({ type: OfficeResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<OfficeResponseDto> {
    return this.officesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an office' })
  @ApiOkResponse({ type: OfficeResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOfficeDto,
  ): Promise<OfficeResponseDto> {
    return this.service.update(id, dto);
    return this.officesService.update(id, dto);
  }
}
