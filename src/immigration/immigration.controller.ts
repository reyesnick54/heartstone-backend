import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { ControllerRouteAccess } from '../security/decorators/controller-route-access.decorator';
import { RouteClass } from '../security/route-class.enum';
import { ImmigrationApplicationProfileService } from './applications/immigration-application-profile.service';
import { ImmigrationProfileService } from './profiles/immigration-profile.service';

@ApiTags('immigration')
@ControllerRouteAccess({
  routeClass: RouteClass.AUTHENTICATED_INSTITUTIONAL,
  authenticationRequired: true,
  scopeRequirement: "Government service domain actor scope with institutional boundaries",
  authorityRequirement: "ConsequentialActionGuard for final government outcomes",
  actorSource: "Session identity with domain access resolution",
  primarySecurityInvariant: "Application and submission endpoints do not confer official outcomes",
})
@Controller('api/v1/immigration')
export class ImmigrationController {
  constructor(
    private readonly profileService: ImmigrationProfileService,
    private readonly applicationProfileService: ImmigrationApplicationProfileService,
  ) {}

  @Post('profiles')
  @ApiOkResponse({ description: 'Immigration profile created' })
  createProfile(@Body() body: Parameters<ImmigrationProfileService['createProfile']>[0]) {
    return this.profileService.createProfile(body);
  }

  @Get('profiles/subject/:subjectIdentityId')
  getProfileForSubject(
    @Param('subjectIdentityId', ParseUUIDPipe) subjectIdentityId: string,
    @Query('requesterIdentityId', ParseUUIDPipe) requesterIdentityId: string,
  ) {
    return this.profileService.getProfileForSubject(subjectIdentityId, requesterIdentityId);
  }

  @Get('visa-application-profiles/:id')
  getVisaApplicationProfile(@Param('id', ParseUUIDPipe) id: string) {
    return this.applicationProfileService.getVisaApplicationProfile(id);
  }
}
