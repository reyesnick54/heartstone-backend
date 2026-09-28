import { Module } from '@nestjs/common';

import { AuthorityModule } from '../authority/authority.module';
import { DatabaseModule } from '../database/database.module';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { MaritimeApplicationReferenceService } from './applications/maritime-application-reference.service';
import { MaritimeAccessService } from './common/maritime-access.service';
import { MaritimeAuthorityService } from './common/maritime-authority.service';
import { MaritimeBoundaryService } from './common/maritime-boundary.service';
import { MaritimeComplianceReferenceService } from './compliance/maritime-compliance-reference.service';
import { MaritimeConfigurationService } from './configuration/maritime-configuration.service';
import { MaritimeCustomsReferenceService } from './customs/maritime-customs-reference.service';
import { MaritimeExternalDependencyService } from './external/maritime-external-dependency.service';
import { MaritimeVesselInspectionService } from './inspections/maritime-vessel-inspection.service';
import { MaritimeInstrumentService } from './instruments/maritime-instrument.service';
import { MaritimeController } from './maritime.controller';
import { VesselPartyRelationshipService } from './vessels/vessel-party-relationship.service';
import { VesselRecordService } from './vessels/vessel-record.service';

@Module({
  imports: [DatabaseModule, SessionsModule, AuthorityModule],
  controllers: [MaritimeController],
  providers: [
    MaritimeBoundaryService,
    MaritimeAccessService,
    MaritimeAuthorityService,
    MaritimeConfigurationService,
    VesselRecordService,
    VesselPartyRelationshipService,
    MaritimeApplicationReferenceService,
    MaritimeExternalDependencyService,
    MaritimeInstrumentService,
    MaritimeVesselInspectionService,
    MaritimeCustomsReferenceService,
    MaritimeComplianceReferenceService,
  ],
  exports: [
    MaritimeBoundaryService,
    MaritimeAccessService,
    MaritimeAuthorityService,
    MaritimeConfigurationService,
    VesselRecordService,
    VesselPartyRelationshipService,
    MaritimeApplicationReferenceService,
    MaritimeExternalDependencyService,
    MaritimeInstrumentService,
    MaritimeVesselInspectionService,
    MaritimeCustomsReferenceService,
    MaritimeComplianceReferenceService,
  ],
})
export class MaritimeModule {}
