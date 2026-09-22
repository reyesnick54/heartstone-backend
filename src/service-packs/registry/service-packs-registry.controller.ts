import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { ServicePackRegistryService } from './service-pack-registry.service';

@ApiTags('service-packs')
@Controller('service-packs/registry')
@UseGuards(SessionAuthGuard)
export class ServicePacksRegistryController {
  constructor(private readonly registryService: ServicePackRegistryService) {}

  @Get()
  @ApiOperation({ summary: 'Administrative service pack registry inventory' })
  @ApiOkResponse({ description: 'Installed packs and deployment inventory snapshot' })
  listRegistry() {
    return this.registryService.listRegistry();
  }

  @Get('jurisdictions/:jurisdictionId')
  @ApiOperation({ summary: 'Registry inventory for a jurisdiction' })
  listByJurisdiction(@Param('jurisdictionId', ParseUUIDPipe) jurisdictionId: string) {
    return this.registryService.listByJurisdiction(jurisdictionId);
  }

  @Get('institutions/:institutionId')
  @ApiOperation({ summary: 'Registry inventory for an institution' })
  listByInstitution(@Param('institutionId', ParseUUIDPipe) institutionId: string) {
    return this.registryService.listByInstitution(institutionId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Registry inventory for a single service pack' })
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.registryService.getRegistryEntry(id);
  }
}
