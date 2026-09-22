import { Injectable } from '@nestjs/common';

import { TransportationBoundaryService } from '../common/transportation-boundary.service';

@Injectable()
export class TransportationAccessService {
  constructor(private readonly boundary: TransportationBoundaryService) {}

  assertApplicantOwnsDriverProfile(requesterIdentityId: string, subjectIdentityId: string): void {
    this.boundary.assertCrossSubjectBlocked(requesterIdentityId, subjectIdentityId);
  }
}
