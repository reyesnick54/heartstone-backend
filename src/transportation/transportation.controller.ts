import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { CurrentSession } from '../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../identity/auth/dto/session-context.dto';
import { SubjectAccessQueryDto } from '../institutional-scope/dto/subject-access-query.dto';
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
    @CurrentSession() session: SessionContextDto,
    @Param('subjectIdentityId', ParseUUIDPipe) subjectIdentityId: string,
    @Query() query: SubjectAccessQueryDto,
  ) {
    return this.driverProfileService.getProfileForSubject(session, subjectIdentityId, query);
  }

  @Get('driver-license-application-profiles/:id')
  getDriverLicenseApplicationProfile(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.driverLicenseApplicationProfileService.getDriverLicenseApplicationProfile(
      session,
      id,
    );
  }
}
