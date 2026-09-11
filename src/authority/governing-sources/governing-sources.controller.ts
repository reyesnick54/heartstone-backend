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
import { GoverningSourceRelationship } from '@prisma/client';

import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { CreateGoverningSourceDto } from './dto/create-governing-source.dto';
import { CreateGoverningSourceRelationshipDto } from './dto/create-governing-source-relationship.dto';
import { GoverningSourceResponseDto } from './dto/governing-source-response.dto';
import { QueryGoverningSourcesDto } from './dto/query-governing-sources.dto';
import { UpdateGoverningSourceAuthenticationDto } from './dto/update-governing-source-authentication.dto';
import { UpdateGoverningSourceStatusDto } from './dto/update-governing-source-status.dto';
import { GoverningSourcesService } from './governing-sources.service';

@ApiTags('governing-sources')
@ApiBearerAuth()
@UseGuards(SessionAuthGuard)
@Controller('authority/governing-sources')
export class GoverningSourcesController {
  constructor(private readonly governingSourcesService: GoverningSourcesService) {}

  @Post()
  @ApiOperation({ summary: 'Create governing source metadata' })
  @ApiCreatedResponse({ type: GoverningSourceResponseDto })
  create(@Body() dto: CreateGoverningSourceDto): Promise<GoverningSourceResponseDto> {
    return this.governingSourcesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List governing sources' })
  @ApiOkResponse({ type: GoverningSourceResponseDto, isArray: true })
  findAll(@Query() query: QueryGoverningSourcesDto): Promise<GoverningSourceResponseDto[]> {
    return this.governingSourcesService.findAll(query);
  }

  @Get(':id/relationships')
  @ApiOperation({ summary: 'List governing source relationships' })
  findRelationships(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<GoverningSourceRelationship[]> {
    return this.governingSourcesService.findRelationships(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get governing source metadata by id' })
  @ApiOkResponse({ type: GoverningSourceResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<GoverningSourceResponseDto> {
    return this.governingSourcesService.findOne(id);
  }

  @Patch(':id/authentication')
  @ApiOperation({ summary: 'Update governing source authentication status' })
  @ApiOkResponse({ type: GoverningSourceResponseDto })
  updateAuthentication(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGoverningSourceAuthenticationDto,
  ): Promise<GoverningSourceResponseDto> {
    return this.governingSourcesService.updateAuthenticationStatus(id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update governing source legal/effective status' })
  @ApiOkResponse({ type: GoverningSourceResponseDto })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGoverningSourceStatusDto,
  ): Promise<GoverningSourceResponseDto> {
    return this.governingSourcesService.updateSourceStatus(id, dto);
  }

  @Post(':id/relationships')
  @ApiOperation({ summary: 'Record a governing source relationship' })
  createRelationship(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateGoverningSourceRelationshipDto,
  ): Promise<GoverningSourceRelationship> {
    return this.governingSourcesService.createRelationship(id, dto);
  }
}
