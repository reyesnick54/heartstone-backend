import { Injectable } from '@nestjs/common';
import { Prisma, TreatmentProgramLifecycleStatus } from '@prisma/client';

import { PrismaService } from '../../../../database/prisma.service';

@Injectable()
export class HealthcareScopeService {
  constructor(private readonly prisma: PrismaService) {}

  buildCitizenPatientWhere(identityId: string): Prisma.PatientHealthcareProfileWhereInput {
    return { subjectIdentityId: identityId };
  }

  buildCitizenApplicationWhere(identityId: string): Prisma.TreatmentApplicationWhereInput {
    return { patientIdentityId: identityId };
  }

  buildCitizenReferralWhere(identityId: string): Prisma.TreatmentReferralWhereInput {
    return { patientIdentityId: identityId };
  }

  buildCitizenEnrollmentWhere(identityId: string): Prisma.TreatmentEnrollmentWhereInput {
    return { patientIdentityId: identityId };
  }

  buildPublishedProgramWhere(): Prisma.TreatmentProgramWhereInput {
    return {
      lifecycleStatus: {
        in: [TreatmentProgramLifecycleStatus.PUBLISHED, TreatmentProgramLifecycleStatus.SUSPENDED],
      },
      isDiscoveryOnly: true,
    };
  }

  async resolvePatientProfileId(identityId: string): Promise<string | null> {
    const profile = await this.prisma.patientHealthcareProfile.findFirst({
      where: { subjectIdentityId: identityId },
      select: { id: true },
    });
    return profile?.id ?? null;
  }
}
