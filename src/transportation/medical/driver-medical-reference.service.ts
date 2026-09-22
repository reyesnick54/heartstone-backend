import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { sanitizeMedicalReferenceForTransportation } from '../common/transportation-medical-sanitizer.util';
import { DRIVER_MEDICAL_REFERENCE_PREFIX } from '../transportation.constants';

@Injectable()
export class DriverMedicalReferenceService {
  constructor(private readonly prisma: PrismaService) {}

  async createReference(input: {
    driverProfileId: string;
    caseId?: string;
    professionalReviewRecordId?: string;
    externalAuthorityId?: string;
    determinationReferenceToken: string;
    determinationSummaryCode?: string;
  }) {
    const referenceNumber = `${DRIVER_MEDICAL_REFERENCE_PREFIX}-${randomUUID().slice(0, 8).toUpperCase()}`;
    return this.prisma.driverMedicalRequirementReference.create({
      data: {
        id: randomUUID(),
        referenceNumber,
        driverProfileId: input.driverProfileId,
        caseId: input.caseId,
        professionalReviewRecordId: input.professionalReviewRecordId,
        externalAuthorityId: input.externalAuthorityId,
        determinationReferenceToken: input.determinationReferenceToken,
        determinationSummaryCode: input.determinationSummaryCode,
        storesDiagnosis: false,
      },
    });
  }

  async getSanitizedReference(id: string) {
    const reference = await this.prisma.driverMedicalRequirementReference.findUnique({
      where: { id },
    });
    if (!reference) {
      return null;
    }
    return sanitizeMedicalReferenceForTransportation({
      referenceNumber: reference.referenceNumber,
      determinationReferenceToken: reference.determinationReferenceToken,
      determinationStatus: reference.determinationStatus,
      determinationSummaryCode: reference.determinationSummaryCode,
      satisfiedAt: reference.satisfiedAt,
      storesDiagnosis: reference.storesDiagnosis,
    });
  }
}
