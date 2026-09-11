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
  }

  @Get()
  @ApiOperation({ summary: 'List government services' })
  @ApiOkResponse({ type: [GovernmentServiceResponseDto] })
  findAll(): Promise<GovernmentServiceResponseDto[]> {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a government service by id' })
  @ApiOkResponse({ type: GovernmentServiceResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<GovernmentServiceResponseDto> {
    return this.service.findOne(id);
  }
}
