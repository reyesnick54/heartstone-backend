import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { MaritimeBoundaryService } from '../common/maritime-boundary.service';

@Injectable()
export class MaritimeCustomsReferenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: MaritimeBoundaryService,
  ) {}

  async linkCustomsOrPortCase(input: {
    vesselRecordId: string;
    shipmentReferenceId?: string;
    caseId?: string;
    maritimeAdministrativeInstrumentId?: string;
    referenceSummary?: string;
    maritimeApprovalDoesNotAuthorizeCustomsRelease?: boolean;
  }) {
    const flag = input.maritimeApprovalDoesNotAuthorizeCustomsRelease ?? true;
    this.boundary.assertMaritimeApprovalDoesNotAuthorizeCustomsRelease(flag);

    return this.prisma.maritimeCustomsCaseReference.create({
      data: {
        id: randomUUID(),
        vesselRecordId: input.vesselRecordId,
        shipmentReferenceId: input.shipmentReferenceId,
        caseId: input.caseId,
        maritimeAdministrativeInstrumentId: input.maritimeAdministrativeInstrumentId,
        maritimeApprovalDoesNotAuthorizeCustomsRelease: true,
        referenceSummary: input.referenceSummary,
      },
    });
  }
}
