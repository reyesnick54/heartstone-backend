import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class HealthcarePatientReferenceService {
  constructor(private readonly prisma: PrismaService) {}

  async ensurePatientReference(input: { patientReference: string; patientIdentityId: string }) {
    return this.prisma.healthcarePatientReference.upsert({
      where: { patientReference: input.patientReference },
      create: {
        patientReference: input.patientReference,
        patientIdentityId: input.patientIdentityId,
      },
      update: {},
    });
  }
}
