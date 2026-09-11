import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CreateServiceOutputDefinitionDto } from './dto/create-service-output-definition.dto';
import { ServiceOutputDefinitionResponseDto } from './dto/service-output-definition-response.dto';
import { ServiceOutputDefinitionsService } from './service-output-definitions.service';

@ApiTags('service-catalog-output-definitions')
@Controller('service-catalog/output-definitions')
export class ServiceOutputDefinitionsController {
  constructor(private readonly service: ServiceOutputDefinitionsService) {}

  @Post()
  @ApiOperation({ summary: 'Define an expected service output (metadata only; does not issue)' })
  @ApiCreatedResponse({ type: ServiceOutputDefinitionResponseDto })
  create(
    @Body() dto: CreateServiceOutputDefinitionDto,
  ): Promise<ServiceOutputDefinitionResponseDto> {
    return this.service.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a service output definition by id' })
  @ApiOkResponse({ type: ServiceOutputDefinitionResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ServiceOutputDefinitionResponseDto> {
    return this.service.findOne(id);
  }

  @Get('by-service-version/:serviceVersionId')
  @ApiOperation({ summary: 'List service output definitions for a service version' })
  @ApiOkResponse({ type: [ServiceOutputDefinitionResponseDto] })
  findByServiceVersion(
    @Param('serviceVersionId', ParseUUIDPipe) serviceVersionId: string,
  ): Promise<ServiceOutputDefinitionResponseDto[]> {
    return this.service.findByServiceVersion(serviceVersionId);
  }
}
