import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CreateGovernmentServiceDto } from './dto/create-government-service.dto';
import { GovernmentServiceResponseDto } from './dto/government-service-response.dto';
import { GovernmentServicesService } from './government-services.service';

@ApiTags('service-catalog-government-services')
@Controller('service-catalog/government-services')
export class GovernmentServicesController {
  constructor(private readonly service: GovernmentServicesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a government service catalog entry' })
  @ApiCreatedResponse({ type: GovernmentServiceResponseDto })
  create(@Body() dto: CreateGovernmentServiceDto): Promise<GovernmentServiceResponseDto> {
    return this.service.create(dto);
import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CreateGovernmentServiceDto } from './dto/create-government-service.dto';
import { CreateGovernmentServiceVersionDto } from './dto/create-government-service-version.dto';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { CreateGovernmentServiceVersionDto } from '../government-service-versions/dto/create-government-service-version.dto';
import { GovernmentServiceVersionResponseDto } from '../government-service-versions/dto/government-service-version-response.dto';
import { GovernmentServiceVersionsService } from '../government-service-versions/government-service-versions.service';
import { CreateGovernmentServiceDto } from './dto/create-government-service.dto';
import { GovernmentServiceResponseDto } from './dto/government-service-response.dto';
import { QueryGovernmentServicesDto } from './dto/query-government-services.dto';
import { UpdateGovernmentServiceDto } from './dto/update-government-service.dto';
import { GovernmentServicesService } from './government-services.service';

@ApiTags('service-catalog')
@Controller('service-catalog/services')
export class GovernmentServicesController {
  constructor(private readonly governmentServices: GovernmentServicesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a government service catalog entry' })
  @ApiCreatedResponse({ description: 'Created government service' })
  create(@Body() dto: CreateGovernmentServiceDto) {
    return this.governmentServices.create(dto);
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class GovernmentServicesController {
  constructor(
    private readonly servicesService: GovernmentServicesService,
    private readonly versionsService: GovernmentServiceVersionsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a government service (stable identity)' })
  @ApiCreatedResponse({ type: GovernmentServiceResponseDto })
  create(@Body() dto: CreateGovernmentServiceDto): Promise<GovernmentServiceResponseDto> {
    return this.servicesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List government services' })
  @ApiOkResponse({ type: [GovernmentServiceResponseDto] })
  findAll(): Promise<GovernmentServiceResponseDto[]> {
    return this.service.findAll();
  @ApiOkResponse({ description: 'Government services' })
  findAll(@Query() query: QueryGovernmentServicesDto) {
    return this.governmentServices.findAll(query);
  @ApiOkResponse({ type: GovernmentServiceResponseDto, isArray: true })
  findAll(@Query() query: QueryGovernmentServicesDto): Promise<GovernmentServiceResponseDto[]> {
    return this.servicesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a government service by id' })
  @ApiOkResponse({ type: GovernmentServiceResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<GovernmentServiceResponseDto> {
    return this.service.findOne(id);
  @ApiOkResponse({ description: 'Government service' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.governmentServices.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a government service' })
  @ApiOkResponse({ description: 'Updated government service' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateGovernmentServiceDto) {
    return this.governmentServices.update(id, dto);
  }

  @Post(':id/versions')
  @ApiOperation({ summary: 'Create a government service version' })
  @ApiCreatedResponse({ description: 'Created service version' })
  createVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateGovernmentServiceVersionDto,
  ) {
    return this.governmentServices.createVersion(id, dto);
  }

  @Post(':id/versions/:versionId/publish')
  @ApiOperation({ summary: 'Publish a government service version' })
  @ApiOkResponse({ description: 'Published service version' })
  publishVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
  ) {
    return this.governmentServices.publishVersion(versionId);
  @ApiOkResponse({ type: GovernmentServiceResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<GovernmentServiceResponseDto> {
    return this.servicesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a government service stable identity' })
  @ApiOkResponse({ type: GovernmentServiceResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGovernmentServiceDto,
  ): Promise<GovernmentServiceResponseDto> {
    return this.servicesService.update(id, dto);
  }

  @Post(':id/versions')
  @ApiOperation({ summary: 'Create a new version for a government service' })
  @ApiCreatedResponse({ type: GovernmentServiceVersionResponseDto })
  createVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateGovernmentServiceVersionDto,
  ): Promise<GovernmentServiceVersionResponseDto> {
    return this.versionsService.create(id, dto);
  }

  @Get(':id/versions')
  @ApiOperation({ summary: 'List all versions for a government service' })
  @ApiOkResponse({ type: GovernmentServiceVersionResponseDto, isArray: true })
  findVersions(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<GovernmentServiceVersionResponseDto[]> {
    return this.versionsService.findAllForService(id);
  }
}
