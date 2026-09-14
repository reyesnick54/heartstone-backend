import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { INSPECTION_COMPLIANCE_REASON_CODES } from '../compliance.constants';

export interface CreateQualificationSnapshotInput {
  inspectionAssignmentId: string;
  qualification: string;
  licenseAccreditation?: string;
  competence: string;
  validFrom: Date;
  validUntil?: Date;
  scope: string;
  conflicts?: string;
  independence?: string;
  verifiedByIdentityId: string;
  verifiedAt: Date;
  requiredForInspection?: boolean;
}

@Injectable()
export class InspectorQualificationService {
  constructor(private readonly prisma: PrismaService) {}

  async createSnapshot(input: CreateQualificationSnapshotInput) {
    const assignment = await this.prisma.inspectionAssignment.findUnique({
      where: { id: input.inspectionAssignmentId },
    });

    if (!assignment) {
      throw new NotFoundException('Inspection assignment not found');
    }

    const at = input.verifiedAt;
    if (input.requiredForInspection !== false) {
      this.assertQualificationCurrent(input.validFrom, input.validUntil, at);
    }

    return this.prisma.inspectorQualificationSnapshot.create({
      data: {
        inspectionAssignmentId: input.inspectionAssignmentId,
        qualification: input.qualification,
        licenseAccreditation: input.licenseAccreditation,
        competence: input.competence,
        validFrom: input.validFrom,
        validUntil: input.validUntil,
        scope: input.scope,
        conflicts: input.conflicts,
        independence: input.independence,
        verifiedByIdentityId: input.verifiedByIdentityId,
        verifiedAt: input.verifiedAt,
      },
    });
  }

  assertQualificationCurrent(validFrom: Date, validUntil: Date | null | undefined, at: Date): void {
    if (validFrom > at) {
      throw new BadRequestException(INSPECTION_COMPLIANCE_REASON_CODES.EXPIRED_QUALIFICATION);
    }

    if (validUntil !== null && validUntil !== undefined && validUntil <= at) {
      throw new BadRequestException(INSPECTION_COMPLIANCE_REASON_CODES.EXPIRED_QUALIFICATION);
    }
  }
}
