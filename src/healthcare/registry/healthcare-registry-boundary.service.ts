import { ForbiddenException, Injectable } from '@nestjs/common';

import { HealthcareBoundaryService } from '../common/healthcare-boundary.service';

@Injectable()
export class HealthcareRegistryBoundaryService {
  constructor(private readonly boundary: HealthcareBoundaryService) {}

  assertCitizenCannotCreateOfficialRegistryEntry(creatingOfficialEntry: boolean): void {
    if (creatingOfficialEntry) {
      throw new ForbiddenException(
        'Citizen or applicant submission cannot directly create an official healthcare registry entry',
      );
    }
  }

  rejectFacilityLicenseClientForgery(payload: Record<string, unknown>): void {
    this.boundary.rejectClientForgedFacilityLicenseFields(payload);
    this.boundary.rejectOrganizationSelfLicenseFields(payload);
  }
}
