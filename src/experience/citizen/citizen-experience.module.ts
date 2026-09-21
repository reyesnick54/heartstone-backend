import { Module } from '@nestjs/common';

import { ApplicationProcessingModule } from '../../application-processing/application-processing.module';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { SessionsModule } from '../../identity/sessions/sessions.module';
import { ServiceCatalogModule } from '../../service-catalog/service-catalog.module';
import { CitizenAccessService } from '../common/citizen-access.service';
import { CitizenExperienceController } from './citizen-experience.controller';
import { CitizenServicesController } from './citizen-services.controller';
import { CitizenServicesService } from './citizen-services.service';
import { CitizenActionCenterService } from './services/citizen-action-center.service';
import { CitizenApplicationsService } from './services/citizen-applications.service';
import { CitizenCaseStatusService } from './services/citizen-case-status.service';
import { CitizenHomeService } from './services/citizen-home.service';
import { CitizenMeService } from './services/citizen-me.service';

@Module({
  imports: [SessionsModule, ApplicationProcessingModule, ServiceCatalogModule],
  controllers: [CitizenExperienceController, CitizenServicesController],
  providers: [
    SessionAuthGuard,
    CitizenAccessService,
    CitizenMeService,
    CitizenHomeService,
    CitizenActionCenterService,
    CitizenApplicationsService,
    CitizenCaseStatusService,
    CitizenServicesService,
  ],
  exports: [CitizenActionCenterService, CitizenAccessService],
})
export class CitizenExperienceModule {}
