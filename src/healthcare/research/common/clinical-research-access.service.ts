import { ForbiddenException, Injectable } from '@nestjs/common';

import { ClinicalResearchBoundaryService } from './clinical-research-boundary.service';

@Injectable()
export class ClinicalResearchAccessService {
  constructor(private readonly boundary: ClinicalResearchBoundaryService) {}

  assertParticipantRecordAccess(input: {
    subjectIdentityId: string;
    requesterIdentityId: string;
  }): void {
    this.boundary.assertCrossParticipantBlocked(input.subjectIdentityId, input.requesterIdentityId);
  }

  filterParticipantScopedRows<T extends { participantProfileId: string }>(
    rows: T[],
    allowedParticipantProfileId: string,
  ): T[] {
    const filtered = rows.filter((row) => row.participantProfileId === allowedParticipantProfileId);
    if (filtered.length !== rows.length) {
      throw new ForbiddenException('Participant data must remain isolated from other participants');
    }
    return filtered;
  }
}
