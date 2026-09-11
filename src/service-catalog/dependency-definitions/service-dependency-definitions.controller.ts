import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CreateServiceDependencyDefinitionDto } from './dto/create-service-dependency-definition.dto';
import { ServiceDependencyDefinitionResponseDto } from './dto/service-dependency-definition-response.dto';
import { ServiceDependencyDefinitionsService } from './service-dependency-definitions.service';

@ApiTags('service-catalog-dependency-definitions')
@Controller('service-catalog/dependency-definitions')
export class ServiceDependencyDefinitionsController {
  constructor(private readonly service: ServiceDependencyDefinitionsService) {}

  @Post()
  @ApiOperation({
    summary:
      'Define operational service dependency metadata (does not confer authority; references Phase 4 where applicable)',
  })
  @ApiCreatedResponse({ type: ServiceDependencyDefinitionResponseDto })
  create(
    @Body() dto: CreateServiceDependencyDefinitionDto,
  ): Promise<ServiceDependencyDefinitionResponseDto> {
    return this.service.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a service dependency definition by id' })
  @ApiOkResponse({ type: ServiceDependencyDefinitionResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ServiceDependencyDefinitionResponseDto> {
    return this.service.findOne(id);
  }

  @Get('by-service-version/:serviceVersionId')
  @ApiOperation({ summary: 'List service dependency definitions for a service version' })
  @ApiOkResponse({ type: [ServiceDependencyDefinitionResponseDto] })
  findByServiceVersion(
    @Param('serviceVersionId', ParseUUIDPipe) serviceVersionId: string,
  ): Promise<ServiceDependencyDefinitionResponseDto[]> {
    return this.service.findByServiceVersion(serviceVersionId);
  }
}
