import { Module } from '@nestjs/common';

import { AuthorityModule } from '../authority/authority.module';
import { DatabaseModule } from '../database/database.module';
import { OfficialModule } from '../experience/official/official.module';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { FinancialLicenceApplicationProfileService } from './applications/financial-licence-application-profile.service';
import { FinancialServicesAccessService } from './common/financial-services-access.service';
import { FinancialServicesAuthorityService } from './common/financial-services-authority.service';
import { FinancialServicesBoundaryService } from './common/financial-services-boundary.service';
import { OfficialFinancialServicesController } from './experience/official-financial-services.controller';
import { OfficialFinancialServicesProjectionService } from './experience/services/official-financial-services-projection.service';
import { FinancialExternalRegulatoryDependencyService } from './external/financial-external-regulatory-dependency.service';
import { FinancialServicesController } from './financial-services.controller';
import { FinancialLicenceRecordService } from './licences/financial-licence-record.service';
import { FinancialLicenceSuspensionService } from './licences/financial-licence-suspension.service';
import { FinancialRegulatedEntityProfileService } from './profiles/financial-regulated-entity-profile.service';
import { FinancialRegulatoryReferenceService } from './regulatory/financial-regulatory-reference.service';
import { FinancialServicesOperationalMetricsService } from './reporting/financial-services-operational-metrics.service';

@Module({
  imports: [DatabaseModule, SessionsModule, OfficialModule, AuthorityModule],
  controllers: [FinancialServicesController, OfficialFinancialServicesController],
  providers: [
    FinancialServicesBoundaryService,
    FinancialServicesAccessService,
    FinancialServicesAuthorityService,
    FinancialExternalRegulatoryDependencyService,
    FinancialRegulatedEntityProfileService,
    FinancialLicenceApplicationProfileService,
    FinancialLicenceRecordService,
    FinancialLicenceSuspensionService,
    FinancialRegulatoryReferenceService,
    FinancialServicesOperationalMetricsService,
    OfficialFinancialServicesProjectionService,
  ],
  exports: [
    FinancialServicesBoundaryService,
    FinancialServicesAccessService,
    FinancialServicesAuthorityService,
    FinancialExternalRegulatoryDependencyService,
    FinancialRegulatedEntityProfileService,
    FinancialLicenceApplicationProfileService,
    FinancialLicenceRecordService,
    FinancialLicenceSuspensionService,
    FinancialRegulatoryReferenceService,
    FinancialServicesOperationalMetricsService,
  ],
})
export class FinancialServicesModule {}
