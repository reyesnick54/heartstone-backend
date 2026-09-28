import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { MaritimeBoundaryService } from '../common/maritime-boundary.service';

@Injectable()
export class MaritimeVesselInspectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: MaritimeBoundaryService,
  ) {}

  async linkCanonicalInspection(input: {
    vesselRecordId: string;
    inspectionRecordId: string;
    linkageRole?: string;
    maritimeApprovalWouldAuthorizeCustomsRelease?: boolean;
  }) {
    this.boundary.assertMaritimeApprovalDoesNotAuthorizeCustomsRelease(
      !(input.maritimeApprovalWouldAuthorizeCustomsRelease ?? false),
    );

    return this.prisma.maritimeVesselInspectionReference.create({
      data: {
        id: randomUUID(),
        vesselRecordId: input.vesselRecordId,
        inspectionRecordId: input.inspectionRecordId,
        linkageRole: input.linkageRole ?? 'SUBJECT',
        inspectionDoesNotAuthorizeCustomsRelease: true,
      },
    });
  }
}
