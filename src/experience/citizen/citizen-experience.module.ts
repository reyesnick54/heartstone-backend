import { Module } from '@nestjs/common';

import { ApplicationsModule } from '../../application-processing/applications/applications.module';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { SessionsModule } from '../../identity/sessions/sessions.module';
import { ServiceCatalogModule } from '../../service-catalog/service-catalog.module';
import { CitizenServicesController } from './citizen-services.controller';
import { CitizenServicesService } from './citizen-services.service';

@Module({
  imports: [ServiceCatalogModule, ApplicationsModule, SessionsModule],
  controllers: [CitizenServicesController],
  providers: [CitizenServicesService, SessionAuthGuard],
})
export class CitizenExperienceModule {}
