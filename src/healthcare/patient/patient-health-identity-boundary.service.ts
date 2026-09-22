import { Injectable } from '@nestjs/common';

import { HealthcareBoundaryService } from '../common/healthcare-boundary.service';

@Injectable()
export class PatientHealthIdentityBoundaryService {
  constructor(private readonly boundary: HealthcareBoundaryService) {}

  rejectClientIdentitySubstitution(payload: Record<string, unknown>): void {
    this.boundary.rejectClientForgedPatientIdentityFields(payload);
  }
}
