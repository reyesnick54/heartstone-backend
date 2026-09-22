import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { TransportationBoundaryService } from '../common/transportation-boundary.service';

@Injectable()
export class VehicleInspectionLinkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: TransportationBoundaryService,
  ) {}

  async linkInspectionResult(input: {
    vehicleRecordId: string;
    inspectionRecordId: string;
    caseId?: string;
    resultSummaryCode?: string;
    registrationRevokedWithoutDecision?: boolean;
  }) {
    this.boundary.assertFailedInspectionDoesNotRevokeRegistration({
      inspectionResultDoesNotRevokeRegistration: true,
      registrationRevokedWithoutDecision: input.registrationRevokedWithoutDecision ?? false,
    });

    return this.prisma.vehicleInspection.create({
      data: {
        id: randomUUID(),
        vehicleRecordId: input.vehicleRecordId,
        inspectionRecordId: input.inspectionRecordId,
        caseId: input.caseId,
        resultSummaryCode: input.resultSummaryCode,
        inspectionResultDoesNotRevokeRegistration: true,
        isRegistrationDecision: false,
        completedAt: new Date(),
      },
    });
  }
}
