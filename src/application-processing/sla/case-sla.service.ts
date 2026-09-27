import { Injectable } from '@nestjs/common';
import { type CaseSlaClock } from '@prisma/client';

import { SlaClockAuthorityService } from '../../remediation/s12/sla/sla-clock-authority.service';

/** Backward-compatible facade over authoritative S12 SLA clock service. */
@Injectable()
export class CaseSlaService {
  constructor(private readonly authority: SlaClockAuthorityService) {}

  pauseClock(caseId: string, clockKey: string, reason: string): Promise<CaseSlaClock | null> {
    return this.authority.pauseClock(caseId, clockKey, reason);
  }

  resumeClock(caseId: string, clockKey: string): Promise<CaseSlaClock | null> {
    return this.authority.resumeClock(caseId, clockKey);
  }

  checkBreach(caseId: string, clockKey: string): Promise<CaseSlaClock | null> {
    return this.authority.evaluateBreach(caseId, clockKey);
  }
}
