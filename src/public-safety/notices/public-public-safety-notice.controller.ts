import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { ControllerRouteAccess } from '../../security/decorators/controller-route-access.decorator';
import { Public } from '../../security/decorators/public.decorator';
import { RouteClass } from '../../security/route-class.enum';
import { PublicSafetyNoticeService } from './public-safety-notice.service';

@ApiTags('public-public-safety')
@Public()
@ControllerRouteAccess({
  routeClass: RouteClass.AUTHENTICATED_INSTITUTIONAL,
  authenticationRequired: true,
  scopeRequirement: "Government service domain actor scope with institutional boundaries",
  authorityRequirement: "ConsequentialActionGuard for final government outcomes",
  actorSource: "Session identity with domain access resolution",
  primarySecurityInvariant: "Application and submission endpoints do not confer official outcomes",
})
@Controller('public/public-safety/notices')
export class PublicPublicSafetyNoticeController {
  constructor(private readonly notices: PublicSafetyNoticeService) {}

  @Get(':noticeReference')
  @ApiOperation({
    summary: 'Published public safety government notice (approved content only)',
  })
  getPublishedNotice(@Param('noticeReference') noticeReference: string) {
    return this.notices.getPublishedNoticeByReference(noticeReference);
  }
}
