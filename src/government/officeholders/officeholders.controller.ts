import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CreateOfficeholderDto } from './dto/create-officeholder.dto';
import { OfficeholderResponseDto } from './dto/officeholder-response.dto';
import { QueryOfficeholdersDto } from './dto/query-officeholders.dto';
import { UpdateOfficeholderDto } from './dto/update-officeholder.dto';
import { OfficeholdersService } from './officeholders.service';

@ApiTags('officeholders')
@Controller('officeholders')
export class OfficeholdersController {
  constructor(private readonly service: OfficeholdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a officeholder' })
  @ApiCreatedResponse({ type: OfficeholderResponseDto })
  create(@Body() dto: CreateOfficeholderDto): Promise<OfficeholderResponseDto> {
    return this.service.create(dto);
  constructor(private readonly officeholdersService: OfficeholdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create an officeholder' })
  @ApiCreatedResponse({ type: OfficeholderResponseDto })
  create(@Body() dto: CreateOfficeholderDto): Promise<OfficeholderResponseDto> {
    return this.officeholdersService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List officeholders' })
  @ApiOkResponse({ type: OfficeholderResponseDto, isArray: true })
  findAll(@Query() query: QueryOfficeholdersDto): Promise<OfficeholderResponseDto[]> {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a officeholder by id' })
  @ApiOkResponse({ type: OfficeholderResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<OfficeholderResponseDto> {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a officeholder' })
    return this.officeholdersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an officeholder by id' })
  @ApiOkResponse({ type: OfficeholderResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<OfficeholderResponseDto> {
    return this.officeholdersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an officeholder' })
  @ApiOkResponse({ type: OfficeholderResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOfficeholderDto,
  ): Promise<OfficeholderResponseDto> {
    return this.service.update(id, dto);
    return this.officeholdersService.update(id, dto);
  }
}
