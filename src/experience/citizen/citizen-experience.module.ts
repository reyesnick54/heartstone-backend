import { Module } from '@nestjs/common';

import { ApplicationProcessingModule } from '../../application-processing/application-processing.module';
import { CivilRegistryModule } from '../../civil-registry/civil-registry.module';
import { DatabaseModule } from '../../database/database.module';
import { SessionAuthGuardModule } from '../../identity/auth/session-auth-guard.module';
import { IdentityCommonModule } from '../../identity/common/identity-common.module';
import { OperationalSupportModule } from '../../operational-support/operational-support.module';
import { SchedulingModule } from '../../scheduling/scheduling.module';
import { ServiceCatalogModule } from '../../service-catalog/service-catalog.module';
import { CitizenAccessService } from '../common/citizen-access.service';
import { CitizenExperienceController } from './citizen-experience.controller';
import { CitizenServicesController } from './citizen-services.controller';
import { CitizenServicesService } from './citizen-services.service';
import { CitizenCivilRegistryProjectionService } from './projections/civil-registry/citizen-civil-registry-projection.service';
import { CitizenAccessScopeService } from './projections/common/citizen-access-scope.service';
import { CitizenExperienceBoundaryService } from './projections/common/citizen-experience-boundary.service';
import { CitizenCredentialsProjectionService } from './projections/credentials/citizen-credentials-projection.service';
import { CitizenDocumentsProjectionService } from './projections/documents/citizen-documents-projection.service';
import { CitizenMessagesProjectionService } from './projections/messages/citizen-messages-projection.service';
import { CitizenPaymentsProjectionService } from './projections/payments/citizen-payments-projection.service';
import { CitizenRenewalsProjectionService } from './projections/renewals/citizen-renewals-projection.service';
import { CitizenActionCenterService } from './services/citizen-action-center.service';
import { CitizenApplicationsService } from './services/citizen-applications.service';
import { CitizenAppointmentsService } from './services/citizen-appointments.service';
import { CitizenCaseStatusService } from './services/citizen-case-status.service';
import { CitizenHomeService } from './services/citizen-home.service';
import { CitizenMeService } from './services/citizen-me.service';

@Module({
  imports: [
    DatabaseModule,
    SessionAuthGuardModule,
    IdentityCommonModule,
    OperationalSupportModule,
    CivilRegistryModule,
    ApplicationProcessingModule,
    ServiceCatalogModule,
    SchedulingModule,
  ],
  controllers: [CitizenExperienceController, CitizenServicesController],
  providers: [
    CitizenAccessService,
    CitizenAccessScopeService,
    CitizenExperienceBoundaryService,
    CitizenDocumentsProjectionService,
    CitizenCredentialsProjectionService,
    CitizenPaymentsProjectionService,
    CitizenMessagesProjectionService,
    CitizenRenewalsProjectionService,
    CitizenCivilRegistryProjectionService,
    CitizenMeService,
    CitizenHomeService,
    CitizenActionCenterService,
    CitizenApplicationsService,
    CitizenCaseStatusService,
    CitizenAppointmentsService,
    CitizenServicesService,
  ],
  exports: [
    CitizenActionCenterService,
    CitizenAccessService,
    CitizenAccessScopeService,
    CitizenExperienceBoundaryService,
    CitizenDocumentsProjectionService,
    CitizenCredentialsProjectionService,
    CitizenPaymentsProjectionService,
    CitizenMessagesProjectionService,
    CitizenRenewalsProjectionService,
    CitizenCivilRegistryProjectionService,
  ],
})
export class CitizenExperienceModule {}
