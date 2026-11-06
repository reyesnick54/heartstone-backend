import { Module } from '@nestjs/common';

import { ApplicationProcessingModule } from '../../application-processing/application-processing.module';
import { CivilRegistryModule } from '../../civil-registry/civil-registry.module';
import { DatabaseModule } from '../../database/database.module';
import { EvidenceModule } from '../../evidence/evidence.module';
import { EvidenceRecordsModule } from '../../evidence-records/evidence-records.module';
import { SessionAuthGuardModule } from '../../identity/auth/session-auth-guard.module';
import { IdentityCommonModule } from '../../identity/common/identity-common.module';
import { OperationalSupportModule } from '../../operational-support/operational-support.module';
import { RedressModule } from '../../redress/redress.module';
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
import { CitizenApplicationDocumentsService } from './self-service/citizen-application-documents.service';
import { CitizenCommunicationPreferencesService } from './self-service/citizen-communication-preferences.service';
import { CitizenProfileCorrectionsService } from './self-service/citizen-profile-corrections.service';
import { CitizenReviewRequestsService } from './self-service/citizen-review-requests.service';
import { CitizenSelfServiceController } from './self-service/citizen-self-service.controller';
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
    RedressModule,
    EvidenceModule,
    EvidenceRecordsModule,
  ],
  controllers: [
    CitizenExperienceController,
    CitizenServicesController,
    CitizenSelfServiceController,
  ],
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
    CitizenReviewRequestsService,
    CitizenProfileCorrectionsService,
    CitizenCommunicationPreferencesService,
    CitizenApplicationDocumentsService,
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
