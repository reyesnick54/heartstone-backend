import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ControllerRouteAccess } from '../../security/decorators/controller-route-access.decorator';
import { Public } from '../../security/decorators/public.decorator';
import { RouteClass } from '../../security/route-class.enum';
import { PublicServiceFamilyResponseDto } from './dto/public-service-response.dto';
import { PublicServiceDiscoveryService } from './public-service-discovery.service';

@ApiTags('public-service-families')
@Public()
@ControllerRouteAccess({
  routeClass: RouteClass.RESTRICTED_ADMINISTRATIVE,
  authenticationRequired: true,
  scopeRequirement: "Service catalog administration or public discovery opt-out",
  authorityRequirement: "Catalog configuration authority for protected routes",
  actorSource: "Administrator or anonymous reader for explicitly public catalog routes",
  primarySecurityInvariant: "Published catalog visibility does not grant case or decision access",
})
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
