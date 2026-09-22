import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { ImmigrationApplicationProfileService } from './applications/immigration-application-profile.service';
import { ImmigrationProfileService } from './profiles/immigration-profile.service';

@ApiTags('immigration')
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
