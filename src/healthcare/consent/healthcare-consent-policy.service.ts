import { ForbiddenException, Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { HEALTHCARE_REASON_CODES } from '../healthcare.constants';

@Injectable()
export class HealthcareConsentPolicyService {
  constructor(private readonly prisma: PrismaService) {}

  async assertActiveConsentForPurpose(input: {
    patientReferenceId: string;
    purposeCode: string;
  }): Promise<void> {
    const purpose = await this.prisma.healthcareConsentPurposeDefinition.findUnique({
      where: { purposeCode: input.purposeCode },
    });
    if (!purpose) {
      throw new ForbiddenException(HEALTHCARE_REASON_CODES.PURPOSE_MISMATCH);
    }

    const activeGrant = await this.prisma.healthcareConsentGrant.findFirst({
      where: {
        patientReferenceId: input.patientReferenceId,
        purposeId: purpose.id,
        isActive: true,
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        withdrawal: null,
      },
    });

    if (!activeGrant) {
      throw new ForbiddenException(HEALTHCARE_REASON_CODES.CONSENT_REVOKED);
    }
  }

  async assertPurposeNotReusedForUnrelatedGrant(input: {
    grantId: string;
    requestedPurposeCode: string;
  }): Promise<void> {
    const grant = await this.prisma.healthcareConsentGrant.findUnique({
      where: { id: input.grantId },
      include: { purpose: true },
    });
    if (!grant) {
      throw new ForbiddenException(HEALTHCARE_REASON_CODES.PURPOSE_MISMATCH);
    }
    if (grant.purpose.purposeCode !== input.requestedPurposeCode) {
      throw new ForbiddenException(HEALTHCARE_REASON_CODES.PURPOSE_MISMATCH);
    }
  }
}
