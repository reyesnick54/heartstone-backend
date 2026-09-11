import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
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
import { CreateServiceFunctionMappingDto } from '../service-function-mappings/dto/create-service-function-mapping.dto';
import { ServiceFunctionMappingResponseDto } from '../service-function-mappings/dto/service-function-mapping-response.dto';
import { ServiceFunctionMappingsService } from '../service-function-mappings/service-function-mappings.service';
import { GovernmentServiceVersionResponseDto } from './dto/government-service-version-response.dto';
import { UpdateGovernmentServiceVersionDto } from './dto/update-government-service-version.dto';
import { GovernmentServiceVersionsService } from './government-service-versions.service';

@ApiTags('service-catalog')
@Controller('service-catalog/service-versions')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class GovernmentServiceVersionsController {
  constructor(
    private readonly versionsService: GovernmentServiceVersionsService,
    private readonly mappingsService: ServiceFunctionMappingsService,
  ) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get a government service version by id' })
  @ApiOkResponse({ type: GovernmentServiceVersionResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<GovernmentServiceVersionResponseDto> {
    return this.versionsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a government service version (draft or status transitions)' })
  @ApiOkResponse({ type: GovernmentServiceVersionResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGovernmentServiceVersionDto,
  ): Promise<GovernmentServiceVersionResponseDto> {
    return this.versionsService.update(id, dto);
  }

  @Post(':id/functions')
  @ApiOperation({ summary: 'Map a Phase 4 function authority record to a service version' })
  @ApiCreatedResponse({ type: ServiceFunctionMappingResponseDto })
  createFunctionMapping(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateServiceFunctionMappingDto,
  ): Promise<ServiceFunctionMappingResponseDto> {
    return this.mappingsService.create(id, dto);
  }

  @Get(':id/functions')
  @ApiOperation({ summary: 'List function authority mappings for a service version' })
  @ApiOkResponse({ type: ServiceFunctionMappingResponseDto, isArray: true })
  findFunctionMappings(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ServiceFunctionMappingResponseDto[]> {
    return this.mappingsService.findAllForVersion(id);
  }
}
