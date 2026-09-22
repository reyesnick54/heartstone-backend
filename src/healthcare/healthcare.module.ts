import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { ActorContextModule } from '../identity/auth/context/actor-context.module';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { HealthcareBoundaryService } from './common/healthcare-boundary.service';
import { HealthcareDataAccessPolicyService } from './common/healthcare-data-access-policy.service';
import { HealthcareConsentService } from './consent/healthcare-consent.service';
import { HealthcareConsentPolicyService } from './consent/healthcare-consent-policy.service';
import { HealthDataRegistryService } from './data-registry/health-data-registry.service';
import { HealthcareController } from './healthcare.controller';
import { HealthcareInteropGatewayService } from './integrations/healthcare-interop-gateway.service';
import { HealthcarePatientReferenceService } from './patient/healthcare-patient-reference.service';
import { HealthcareRegulatoryReferenceService } from './regulatory/healthcare-regulatory-reference.service';
import { ResearchDataGovernanceService } from './research/research-data-governance.service';
import { ClinicalSafetyService } from './safety/clinical-safety.service';

@Module({
  imports: [DatabaseModule, SessionsModule, ActorContextModule],
  controllers: [HealthcareController],
  providers: [
    HealthcareBoundaryService,
    HealthcareConsentPolicyService,
    HealthcareDataAccessPolicyService,
    HealthcareConsentService,
    HealthDataRegistryService,
    ResearchDataGovernanceService,
    ClinicalSafetyService,
    HealthcareRegulatoryReferenceService,
    HealthcareInteropGatewayService,
    HealthcarePatientReferenceService,
  ],
  exports: [
    HealthcareBoundaryService,
    HealthcareConsentPolicyService,
    HealthcareDataAccessPolicyService,
    HealthcareConsentService,
    HealthDataRegistryService,
    ResearchDataGovernanceService,
    ClinicalSafetyService,
    HealthcareRegulatoryReferenceService,
    HealthcareInteropGatewayService,
    HealthcarePatientReferenceService,
  ],
})
export class HealthcareModule {}
