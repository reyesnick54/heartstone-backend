import { Injectable } from '@nestjs/common';
import { EmergencyInterimActionType } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { ComplianceBoundaryService } from './compliance-boundary.service';

export interface RecordEmergencyInterimActionInput {
  complianceMatterId?: string;
  officialInstrumentId?: string;
  actionType: EmergencyInterimActionType;
  recordedByIdentityId: string;
  recordedByOfficeholderId: string;
  reason: string;
}

@Injectable()
export class EmergencyInterimActionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ComplianceBoundaryService,
  ) {}

  async record(input: RecordEmergencyInterimActionInput) {
    this.boundary.assertPhase9CannotCreateSuspensionDecision({
      isCreatingSuspensionDecision: false,
    });
    this.boundary.assertEmergencyActionDoesNotSuspendInstrument({
      doesNotSuspendInstrument: true,
      attemptsInstrumentSuspension: false,
    });

    return this.prisma.emergencyInterimActionRecord.create({
      data: {
        complianceMatterId: input.complianceMatterId,
        officialInstrumentId: input.officialInstrumentId,
        actionType: input.actionType,
        recordedByIdentityId: input.recordedByIdentityId,
        recordedByOfficeholderId: input.recordedByOfficeholderId,
        reason: input.reason,
        doesNotSuspendInstrument: true,
      },
    });
  }
}
