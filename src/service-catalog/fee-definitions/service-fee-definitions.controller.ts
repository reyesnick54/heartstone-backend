import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CreateServiceFeeDefinitionDto } from './dto/create-service-fee-definition.dto';
import { ServiceFeeDefinitionResponseDto } from './dto/service-fee-definition-response.dto';
import { ServiceFeeDefinitionsService } from './service-fee-definitions.service';

@ApiTags('service-catalog-fee-definitions')
@Controller('service-catalog/fee-definitions')
export class ServiceFeeDefinitionsController {
  constructor(private readonly service: ServiceFeeDefinitionsService) {}

  @Post()
  @ApiOperation({ summary: 'Define a service fee (metadata only; no payment processing)' })
  @ApiCreatedResponse({ type: ServiceFeeDefinitionResponseDto })
  create(@Body() dto: CreateServiceFeeDefinitionDto): Promise<ServiceFeeDefinitionResponseDto> {
    return this.service.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a service fee definition by id' })
  @ApiOkResponse({ type: ServiceFeeDefinitionResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ServiceFeeDefinitionResponseDto> {
    return this.service.findOne(id);
  }

  @Get('by-service-version/:serviceVersionId')
  @ApiOperation({ summary: 'List fee definitions for a service version (includes historical)' })
  @ApiOkResponse({ type: [ServiceFeeDefinitionResponseDto] })
  findByServiceVersion(
    @Param('serviceVersionId', ParseUUIDPipe) serviceVersionId: string,
  ): Promise<ServiceFeeDefinitionResponseDto[]> {
    return this.service.findByServiceVersion(serviceVersionId);
  }

  @Get('current/by-service-version/:serviceVersionId')
  @ApiOperation({ summary: 'Get current fee definition by fee code' })
  @ApiOkResponse({ type: ServiceFeeDefinitionResponseDto })
  findCurrent(
    @Param('serviceVersionId', ParseUUIDPipe) serviceVersionId: string,
    @Query('feeCode') feeCode: string,
  ): Promise<ServiceFeeDefinitionResponseDto | null> {
    return this.service.findCurrentByFeeCode(serviceVersionId, feeCode);
  }
}
