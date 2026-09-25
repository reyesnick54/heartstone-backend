import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { CurrentSession } from '../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../identity/auth/dto/session-context.dto';
import { SubjectAccessQueryDto } from '../institutional-scope/dto/subject-access-query.dto';
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
    @CurrentSession() session: SessionContextDto,
    @Param('subjectIdentityId', ParseUUIDPipe) subjectIdentityId: string,
    @Query() query: SubjectAccessQueryDto,
  ) {
    return this.profileService.getProfileForSubject(session, subjectIdentityId, query);
  }

  @Get('visa-application-profiles/:id')
  getVisaApplicationProfile(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.applicationProfileService.getVisaApplicationProfile(session, id);
  }
}
