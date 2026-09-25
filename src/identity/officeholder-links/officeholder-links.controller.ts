import { Body, Controller, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ControllerRouteAccess } from '../../security/decorators/controller-route-access.decorator';
import { RouteClass } from '../../security/route-class.enum';
import { CreateOfficeholderLinkDto } from './dto/create-officeholder-link.dto';
import { OfficeholderLinkResponseDto } from './dto/officeholder-link-response.dto';
import { OfficeholderLinksService } from './officeholder-links.service';

@ApiTags('identity-officeholder-links')
@ControllerRouteAccess({
  routeClass: RouteClass.RESTRICTED_ADMINISTRATIVE,
  authenticationRequired: true,
  scopeRequirement: "Identity administration or authenticated self-service session",
  authorityRequirement: "No government authority inferred from identity alone",
  actorSource: "Session identity or institutional administrator",
  primarySecurityInvariant: "User != Officeholder != Role != Permission != Authority",
})
@Controller('identity/officeholder-links')
export class OfficeholderLinksController {
  constructor(private readonly officeholderLinksService: OfficeholderLinksService) {}

  @Post()
  @ApiOperation({
    summary: 'Link an identity to an officeholder (controlled path, no authority conferred)',
  })
  @ApiCreatedResponse({ type: OfficeholderLinkResponseDto })
  create(@Body() dto: CreateOfficeholderLinkDto): Promise<OfficeholderLinkResponseDto> {
    return this.officeholderLinksService.create(dto);
  }
}
