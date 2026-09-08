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
  @ApiOkResponse({ type: OfficeholderResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOfficeholderDto,
  ): Promise<OfficeholderResponseDto> {
    return this.service.update(id, dto);
  }
}
