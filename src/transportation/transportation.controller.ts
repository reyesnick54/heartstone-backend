import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { ControllerRouteAccess } from '../security/decorators/controller-route-access.decorator';
import { RouteClass } from '../security/route-class.enum';
import { DriverLicenseApplicationProfileService } from './applications/driver-license-application-profile.service';
import { DriverProfileService } from './profiles/driver-profile.service';

@ApiTags('transportation')
@ControllerRouteAccess({
  routeClass: RouteClass.AUTHENTICATED_INSTITUTIONAL,
  authenticationRequired: true,
  scopeRequirement: "Government service domain actor scope with institutional boundaries",
  authorityRequirement: "ConsequentialActionGuard for final government outcomes",
  actorSource: "Session identity with domain access resolution",
  primarySecurityInvariant: "Application and submission endpoints do not confer official outcomes",
})
@Controller('api/v1/transportation')
export class TransportationController {
  constructor(
    private readonly driverProfileService: DriverProfileService,
    private readonly driverLicenseApplicationProfileService: DriverLicenseApplicationProfileService,
  ) {}

  @Post('driver-profiles')
  @ApiOkResponse({ description: 'Driver profile created' })
  createDriverProfile(@Body() body: Parameters<DriverProfileService['createProfile']>[0]) {
    return this.driverProfileService.createProfile(body);
  }

  @Get('driver-profiles/subject/:subjectIdentityId')
  getDriverProfileForSubject(
    @Param('subjectIdentityId', ParseUUIDPipe) subjectIdentityId: string,
    @Query('requesterIdentityId', ParseUUIDPipe) requesterIdentityId: string,
  ) {
    return this.driverProfileService.getProfileForSubject(subjectIdentityId, requesterIdentityId);
  }

  @Get('driver-license-application-profiles/:id')
  getDriverLicenseApplicationProfile(@Param('id', ParseUUIDPipe) id: string) {
    return this.driverLicenseApplicationProfileService.getDriverLicenseApplicationProfile(id);
  }
}
