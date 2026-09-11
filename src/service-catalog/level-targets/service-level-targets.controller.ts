import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CreateServiceLevelTargetDto } from './dto/create-service-level-target.dto';
import { ServiceLevelTargetResponseDto } from './dto/service-level-target-response.dto';
import { ServiceLevelTargetsService } from './service-level-targets.service';

@ApiTags('service-catalog-level-targets')
@Controller('service-catalog/level-targets')
export class ServiceLevelTargetsController {
  constructor(private readonly service: ServiceLevelTargetsService) {}

  @Post()
  @ApiOperation({ summary: 'Define a service-level target (metadata only; no case timers)' })
  @ApiCreatedResponse({ type: ServiceLevelTargetResponseDto })
  create(@Body() dto: CreateServiceLevelTargetDto): Promise<ServiceLevelTargetResponseDto> {
    return this.service.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a service level target by id' })
  @ApiOkResponse({ type: ServiceLevelTargetResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ServiceLevelTargetResponseDto> {
    return this.service.findOne(id);
  }

  @Get('by-service-version/:serviceVersionId')
  @ApiOperation({ summary: 'List service level targets for a service version' })
  @ApiOkResponse({ type: [ServiceLevelTargetResponseDto] })
  findByServiceVersion(
    @Param('serviceVersionId', ParseUUIDPipe) serviceVersionId: string,
  ): Promise<ServiceLevelTargetResponseDto[]> {
    return this.service.findByServiceVersion(serviceVersionId);
  }
}
