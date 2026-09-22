import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { ActorContextModule } from '../identity/auth/context/actor-context.module';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { HealthcareBoundaryService } from './common/healthcare-boundary.service';
import { HealthcareFoundationAccessPolicyService } from './common/healthcare-data-access-policy.service';
import { HealthcareConsentService } from './consent/healthcare-consent.service';
import { HealthcareConsentPolicyService } from './consent/healthcare-consent-policy.service';
import { HealthDataRegistryService } from './data-registry/health-data-registry.service';
import { HealthcareController } from './healthcare.controller';
import { HealthcareInteropGatewayService } from './integrations/healthcare-interop-gateway.service';
import { HealthcarePatientReferenceService } from './patient/healthcare-patient-reference.service';
import { PatientHealthIdentityBoundaryService } from './patient/patient-health-identity-boundary.service';
import { HealthcareAccessAuditService } from './privacy/healthcare-access-audit.service';
import { HealthcareBreakGlassService } from './privacy/healthcare-break-glass.service';
import { HealthcareDataAccessPolicyService } from './privacy/healthcare-data-access-policy.service';
import { HealthcarePrivacySearchService } from './privacy/healthcare-privacy-search.service';
import { HealthcareProfessionalLicensingService } from './professional/healthcare-professional-licensing.service';
import { HealthcareRegistryBoundaryService } from './registry/healthcare-registry-boundary.service';
import { HealthcareRegulatoryReferenceService } from './regulatory/healthcare-regulatory-reference.service';
import { ClinicalResearchModule } from './research/clinical-research.module';
import { ResearchDataGovernanceService } from './research/research-data-governance.service';
import { ClinicalSafetyService } from './safety/clinical-safety.service';
import { TreatmentModule } from './treatment/treatment.module';

@Module({
  imports: [DatabaseModule, SessionsModule, ActorContextModule, ClinicalResearchModule, TreatmentModule],
  controllers: [HealthcareController],
  providers: [
    HealthcareBoundaryService,
    HealthcareFoundationAccessPolicyService,
    HealthcareConsentPolicyService,
    HealthcareConsentService,
    HealthDataRegistryService,
    ResearchDataGovernanceService,
    ClinicalSafetyService,
    HealthcareRegulatoryReferenceService,
    HealthcareInteropGatewayService,
    HealthcarePatientReferenceService,
    HealthcareRegistryBoundaryService,
    PatientHealthIdentityBoundaryService,
    HealthcareProfessionalLicensingService,
    HealthcareDataAccessPolicyService,
    HealthcareAccessAuditService,
    HealthcareBreakGlassService,
    HealthcarePrivacySearchService,
  ],
  exports: [
    HealthcareFoundationAccessPolicyService,
    HealthcareConsentPolicyService,
    HealthcareConsentService,
    HealthDataRegistryService,
    ResearchDataGovernanceService,
    ClinicalSafetyService,
    HealthcareRegulatoryReferenceService,
    HealthcareInteropGatewayService,
    HealthcarePatientReferenceService,
    HealthcareBoundaryService,
    HealthcareRegistryBoundaryService,
    PatientHealthIdentityBoundaryService,
    HealthcareProfessionalLicensingService,
    HealthcareDataAccessPolicyService,
    HealthcareAccessAuditService,
    HealthcareBreakGlassService,
    HealthcarePrivacySearchService,
    ClinicalResearchModule,
    TreatmentModule,
  ],
})
export class HealthcareModule {}
