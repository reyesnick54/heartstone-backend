import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CreateGovernmentBodyDto } from './dto/create-government-body.dto';
import { GovernmentBodyResponseDto } from './dto/government-body-response.dto';
import { QueryGovernmentBodiesDto } from './dto/query-government-bodies.dto';
import { UpdateGovernmentBodyDto } from './dto/update-government-body.dto';
import { GovernmentBodiesService } from './government-bodies.service';

@ApiTags('government-bodies')
@Controller('government-bodies')
export class GovernmentBodiesController {
  constructor(private readonly service: GovernmentBodiesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a governmentbody' })
  @ApiCreatedResponse({ type: GovernmentBodyResponseDto })
  create(@Body() dto: CreateGovernmentBodyDto): Promise<GovernmentBodyResponseDto> {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List government-bodies' })
  @ApiOkResponse({ type: GovernmentBodyResponseDto, isArray: true })
  findAll(@Query() query: QueryGovernmentBodiesDto): Promise<GovernmentBodyResponseDto[]> {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a governmentbody by id' })
  @ApiOkResponse({ type: GovernmentBodyResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<GovernmentBodyResponseDto> {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a governmentbody' })
  @ApiOkResponse({ type: GovernmentBodyResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGovernmentBodyDto,
  ): Promise<GovernmentBodyResponseDto> {
    return this.service.update(id, dto);
  }
}
