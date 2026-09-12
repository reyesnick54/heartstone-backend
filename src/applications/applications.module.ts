import { Module } from '@nestjs/common';

import { SessionAuthGuard } from '../identity/auth/guards/session-auth.guard';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { ServiceCatalogModule } from '../service-catalog/service-catalog.module';
import { ApplicationAccessService } from './applications/application-access.service';
import { ApplicationIntakeValidationService } from './applications/application-intake-validation.service';
import { ApplicationsController } from './applications/applications.controller';
import { ApplicationsService } from './applications/applications.service';

@Module({
  imports: [SessionsModule, ServiceCatalogModule],
  controllers: [ApplicationsController],
  providers: [
    ApplicationsService,
    ApplicationAccessService,
    ApplicationIntakeValidationService,
    SessionAuthGuard,
  ],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
