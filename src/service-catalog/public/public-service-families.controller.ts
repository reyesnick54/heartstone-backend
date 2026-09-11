import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { PublicServiceFamilyResponseDto } from './dto/public-service-response.dto';
import { PublicServiceDiscoveryService } from './public-service-discovery.service';

@ApiTags('public-service-families')
@Controller('public/service-families')
export class PublicServiceFamiliesController {
  constructor(private readonly publicServiceDiscoveryService: PublicServiceDiscoveryService) {}

  @Get()
  @ApiOperation({ summary: 'List service families with publicly discoverable services' })
  @ApiOkResponse({ type: PublicServiceFamilyResponseDto, isArray: true })
  listFamilies(): Promise<PublicServiceFamilyResponseDto[]> {
    return this.publicServiceDiscoveryService.listServiceFamilies();
  }
}
