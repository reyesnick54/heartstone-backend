import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GoverningSourceStatus } from '@prisma/client';

import { AuthenticateGoverningSourceDto } from './dto/authenticate-governing-source.dto';
import { CreateGoverningSourceDto } from './dto/create-governing-source.dto';
import { GoverningSourceResponseDto } from './dto/governing-source-response.dto';
import { GoverningSourcesService } from './governing-sources.service';

@ApiTags('authority-governing-sources')
@Controller('authority/governing-sources')
export class GoverningSourcesController {
  constructor(private readonly service: GoverningSourcesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a governing source (draft)' })
  @ApiCreatedResponse({ type: GoverningSourceResponseDto })
  create(@Body() dto: CreateGoverningSourceDto): Promise<GoverningSourceResponseDto> {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List governing sources' })
  @ApiOkResponse({ type: GoverningSourceResponseDto, isArray: true })
  findAll(@Query('status') status?: GoverningSourceStatus): Promise<GoverningSourceResponseDto[]> {
    return this.service.findAll({ status });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a governing source by id' })
  @ApiOkResponse({ type: GoverningSourceResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<GoverningSourceResponseDto> {
    return this.service.findOne(id);
  }

  @Patch(':id/authenticate')
  @ApiOperation({ summary: 'Authenticate a governing source' })
  @ApiOkResponse({ type: GoverningSourceResponseDto })
  authenticate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AuthenticateGoverningSourceDto,
  ): Promise<GoverningSourceResponseDto> {
    return this.service.authenticate(id, dto);
  }

  @Patch(':id/revoke')
  @ApiOperation({ summary: 'Revoke a governing source' })
  @ApiOkResponse({ type: GoverningSourceResponseDto })
  revoke(@Param('id', ParseUUIDPipe) id: string): Promise<GoverningSourceResponseDto> {
    return this.service.revoke(id);
  }
}
