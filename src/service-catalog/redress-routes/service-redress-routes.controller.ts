import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CreateServiceRedressRouteDto } from './dto/create-service-redress-route.dto';
import { ServiceRedressRouteResponseDto } from './dto/service-redress-route-response.dto';
import { ServiceRedressRoutesService } from './service-redress-routes.service';

@ApiTags('service-catalog-redress-routes')
@Controller('service-catalog/redress-routes')
export class ServiceRedressRoutesController {
  constructor(private readonly service: ServiceRedressRoutesService) {}

  @Post()
  @ApiOperation({
    summary: 'Define a review/complaint/redress route (metadata only; no appeal cases)',
  })
  @ApiCreatedResponse({ type: ServiceRedressRouteResponseDto })
  create(@Body() dto: CreateServiceRedressRouteDto): Promise<ServiceRedressRouteResponseDto> {
    return this.service.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a service redress route by id' })
  @ApiOkResponse({ type: ServiceRedressRouteResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ServiceRedressRouteResponseDto> {
    return this.service.findOne(id);
  }

  @Get('by-service-version/:serviceVersionId')
  @ApiOperation({ summary: 'List service redress routes for a service version' })
  @ApiOkResponse({ type: [ServiceRedressRouteResponseDto] })
  findByServiceVersion(
    @Param('serviceVersionId', ParseUUIDPipe) serviceVersionId: string,
  ): Promise<ServiceRedressRouteResponseDto[]> {
    return this.service.findByServiceVersion(serviceVersionId);
  }
}
