import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { DriverLicenseApplicationProfileService } from './applications/driver-license-application-profile.service';
import { DriverProfileService } from './profiles/driver-profile.service';

@ApiTags('transportation')
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
