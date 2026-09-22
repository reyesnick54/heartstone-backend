import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { HealthcareBoundaryService } from './common/healthcare-boundary.service';
import { PatientHealthIdentityBoundaryService } from './patient/patient-health-identity-boundary.service';
import { HealthcareAccessAuditService } from './privacy/healthcare-access-audit.service';
import { HealthcareBreakGlassService } from './privacy/healthcare-break-glass.service';
import { HealthcareDataAccessPolicyService } from './privacy/healthcare-data-access-policy.service';
import { HealthcarePrivacySearchService } from './privacy/healthcare-privacy-search.service';
import { HealthcareProfessionalLicensingService } from './professional/healthcare-professional-licensing.service';
import { HealthcareRegistryBoundaryService } from './registry/healthcare-registry-boundary.service';
import { ClinicalResearchModule } from './research/clinical-research.module';

@Module({
  imports: [DatabaseModule, ClinicalResearchModule],
  providers: [
    HealthcareBoundaryService,
    HealthcareRegistryBoundaryService,
    PatientHealthIdentityBoundaryService,
    HealthcareProfessionalLicensingService,
    HealthcareDataAccessPolicyService,
    HealthcareAccessAuditService,
    HealthcareBreakGlassService,
    HealthcarePrivacySearchService,
  ],
  exports: [
    HealthcareBoundaryService,
    HealthcareRegistryBoundaryService,
    PatientHealthIdentityBoundaryService,
    HealthcareProfessionalLicensingService,
    HealthcareDataAccessPolicyService,
    HealthcareAccessAuditService,
    HealthcareBreakGlassService,
    HealthcarePrivacySearchService,
    ClinicalResearchModule,
  ],
})
export class HealthcareModule {}
