import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { SessionsModule } from '../../identity/sessions/sessions.module';
import { TreatmentPatientDataAccessPolicyService } from './access/healthcare-data-access-policy.service';
import { TreatmentExperienceBoundaryService } from './boundary/treatment-experience-boundary.service';
import { TreatmentBoundaryService } from './common/treatment-boundary.service';
import { TreatmentEnrollmentService } from './enrollment/treatment-enrollment.service';
import { CitizenHealthcareController } from './experience/citizen-healthcare.controller';
import { ProviderHealthcareController } from './experience/provider-healthcare.controller';
import { CitizenHealthcareProjectionService } from './experience/services/citizen-healthcare-projection.service';
import { HealthcareScopeService } from './experience/services/healthcare-scope.service';
import { ProviderHealthcareProjectionService } from './experience/services/provider-healthcare-projection.service';
import { TreatmentEligibilityReviewService } from './reviews/treatment-eligibility-review.service';

@Module({
  imports: [DatabaseModule, SessionsModule],
  controllers: [CitizenHealthcareController, ProviderHealthcareController],
  providers: [
    TreatmentBoundaryService,
    TreatmentExperienceBoundaryService,
    TreatmentPatientDataAccessPolicyService,
    HealthcareScopeService,
    CitizenHealthcareProjectionService,
    ProviderHealthcareProjectionService,
    TreatmentEligibilityReviewService,
    TreatmentEnrollmentService,
  ],
  exports: [
    TreatmentBoundaryService,
    TreatmentExperienceBoundaryService,
    TreatmentPatientDataAccessPolicyService,
    HealthcareScopeService,
    CitizenHealthcareProjectionService,
    ProviderHealthcareProjectionService,
    TreatmentEligibilityReviewService,
    TreatmentEnrollmentService,
  ],
})
export class TreatmentModule {}
