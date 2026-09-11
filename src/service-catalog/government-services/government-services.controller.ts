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
  @ApiOkResponse({ type: GovernmentServiceResponseDto, isArray: true })
  findAll(@Query() query: QueryGovernmentServicesDto): Promise<GovernmentServiceResponseDto[]> {
    return this.servicesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a government service by id' })
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
