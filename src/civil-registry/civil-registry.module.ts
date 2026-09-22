import { Module } from '@nestjs/common';

import { AuthorityModule } from '../authority/authority.module';
import { DatabaseModule } from '../database/database.module';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { CivilRegistryAccessService } from './access/civil-registry-access.service';
import { CivilRecordAmendmentService } from './amendments/civil-record-amendment.service';
import { CivilRegistryAuditService } from './audit/civil-registry-audit.service';
import { CivilRegistryCertificateService } from './certificates/civil-registry-certificate.service';
import { CivilRegistryVitalRecordCertificateService } from './certificates/civil-registry-vital-record-certificate.service';
import { CivilRegistryController } from './civil-registry.controller';
import { CivilRegistryClassificationAccessService } from './common/civil-registry-access.service';
import { CivilRegistryBoundaryService } from './common/civil-registry-boundary.service';
import { CivilRecordCorrectionService } from './corrections/civil-record-correction.service';
import { VitalEventIntakeService } from './intake/vital-event-intake.service';
import { CivilRegistryReadService } from './queries/civil-registry-read.service';
import { CivilRegistryRegistrationService } from './registration/civil-registry-registration.service';
import { CivilRegistryVitalRecordRegistrationService } from './registration/civil-registry-vital-record-registration.service';
import { CivilRegistryVerificationService } from './verification/civil-registry-verification.service';
import { PublicCivilRegistryVerificationController } from './verification/public-civil-registry-verification.controller';

@Module({
  imports: [DatabaseModule, SessionsModule, AuthorityModule],
  controllers: [CivilRegistryController, PublicCivilRegistryVerificationController],
  providers: [
    CivilRegistryBoundaryService,
    CivilRegistryClassificationAccessService,
    CivilRegistryAccessService,
    CivilRegistryAuditService,
    VitalEventIntakeService,
    CivilRegistryRegistrationService,
    CivilRegistryVitalRecordRegistrationService,
    CivilRecordAmendmentService,
    CivilRecordCorrectionService,
    CivilRegistryCertificateService,
    CivilRegistryVitalRecordCertificateService,
    CivilRegistryReadService,
    CivilRegistryVerificationService,
  ],
  exports: [
    CivilRegistryBoundaryService,
    CivilRegistryClassificationAccessService,
    CivilRegistryAccessService,
    CivilRegistryRegistrationService,
    CivilRegistryVitalRecordRegistrationService,
    CivilRecordAmendmentService,
    CivilRecordCorrectionService,
    CivilRegistryCertificateService,
    CivilRegistryVitalRecordCertificateService,
    CivilRegistryReadService,
    VitalEventIntakeService,
    CivilRegistryAuditService,
    CivilRegistryVerificationService,
  ],
})
export class CivilRegistryModule {}
