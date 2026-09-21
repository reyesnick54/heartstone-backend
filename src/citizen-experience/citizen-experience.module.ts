import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { IdentityCommonModule } from '../identity/common/identity-common.module';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { OperationalSupportModule } from '../operational-support/operational-support.module';
import { CitizenExperienceController } from './citizen-experience.controller';
import { CitizenAccessScopeService } from './common/citizen-access-scope.service';
import { CitizenExperienceBoundaryService } from './common/citizen-experience-boundary.service';
import { CitizenCredentialsProjectionService } from './credentials/citizen-credentials-projection.service';
import { CitizenDocumentsProjectionService } from './documents/citizen-documents-projection.service';
import { CitizenMessagesProjectionService } from './messages/citizen-messages-projection.service';
import { CitizenPaymentsProjectionService } from './payments/citizen-payments-projection.service';
import { CitizenRenewalsProjectionService } from './renewals/citizen-renewals-projection.service';

@Module({
  imports: [DatabaseModule, SessionsModule, IdentityCommonModule, OperationalSupportModule],
  controllers: [CitizenExperienceController],
  providers: [
    CitizenAccessScopeService,
    CitizenExperienceBoundaryService,
    CitizenDocumentsProjectionService,
    CitizenCredentialsProjectionService,
    CitizenPaymentsProjectionService,
    CitizenMessagesProjectionService,
    CitizenRenewalsProjectionService,
  ],
  exports: [
    CitizenAccessScopeService,
    CitizenExperienceBoundaryService,
    CitizenDocumentsProjectionService,
    CitizenCredentialsProjectionService,
    CitizenPaymentsProjectionService,
    CitizenMessagesProjectionService,
    CitizenRenewalsProjectionService,
  ],
})
export class CitizenExperienceModule {}
