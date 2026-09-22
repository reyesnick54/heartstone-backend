import { Injectable } from '@nestjs/common';
import { HealthcareLicenseStatus } from '@prisma/client';

import { HealthcareBoundaryService } from '../common/healthcare-boundary.service';

@Injectable()
export class HealthcareProfessionalLicensingService {
  constructor(private readonly boundary: HealthcareBoundaryService) {}

  assertMayRepresentAsLicensed(input: {
    licenseStatus?: HealthcareLicenseStatus;
    expiresAt?: Date | null;
    now?: Date;
  }): void {
    this.boundary.assertLicensedProfessionalRepresentation(input);
  }

  rejectClientLicenseForgery(payload: Record<string, unknown>): void {
    this.boundary.rejectClientForgedProfessionalLicenseFields(payload);
  }

  assertOfficialActivationRequiresWorkflow(input: {
    governmentDecisionId?: string | null;
    authorityEvaluationRecordId?: string | null;
  }): void {
    this.boundary.assertOfficialLicenseRequiresWorkflow(input);
  }
}
