import { Module } from '@nestjs/common';

import { ApplicationProcessingModule } from '../../application-processing/application-processing.module';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { SessionsModule } from '../../identity/sessions/sessions.module';
import { CitizenAccessService } from '../common/citizen-access.service';
import { CitizenExperienceController } from './citizen-experience.controller';
import { CitizenActionCenterService } from './services/citizen-action-center.service';
import { CitizenApplicationsService } from './services/citizen-applications.service';
import { CitizenCaseStatusService } from './services/citizen-case-status.service';
import { CitizenHomeService } from './services/citizen-home.service';
import { CitizenMeService } from './services/citizen-me.service';

@Module({
  imports: [SessionsModule, ApplicationProcessingModule],
  controllers: [CitizenExperienceController],
  providers: [
    SessionAuthGuard,
    CitizenAccessService,
    CitizenMeService,
    CitizenHomeService,
    CitizenActionCenterService,
    CitizenApplicationsService,
    CitizenCaseStatusService,
  ],
})
export class CitizenExperienceModule {}
