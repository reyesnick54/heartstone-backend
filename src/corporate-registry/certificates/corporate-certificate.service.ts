import { Injectable } from '@nestjs/common';
import {
  CorporateCertificateStatus,
  CorporateRegistrationStatus,
  CorporateRegistryRecordStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CorporateCertificateIssuanceBlockedException } from '../common/corporate-registry.exceptions';

@Injectable()
export class CorporateCertificateService {
  constructor(private readonly prisma: PrismaService) {}

  async issueCertificate(input: {
    profileId: string;
    certificateReference: string;
    label: string;
  }) {
    const profile = await this.prisma.corporateRegistryProfile.findUnique({
      where: { id: input.profileId },
    });

    if (!profile) {
      throw new CorporateCertificateIssuanceBlockedException('profile not found');
    }

    if (profile.recordApprovalStatus !== CorporateRegistryRecordStatus.APPROVED) {
      throw new CorporateCertificateIssuanceBlockedException(
        'source corporate record is not an approved registry record',
      );
    }

    if (
      profile.registrationStatus !== CorporateRegistrationStatus.ACTIVE &&
      profile.registrationStatus !== CorporateRegistrationStatus.RESTORED
    ) {
      throw new CorporateCertificateIssuanceBlockedException('entity is not in an issuable status');
    }

    const draft = await this.prisma.corporateCertificate.findFirst({
      where: {
        profileId: input.profileId,
        status: CorporateCertificateStatus.DRAFT,
      },
    });

    if (draft && draft.sourceRecordStatus !== CorporateRegistryRecordStatus.APPROVED) {
      throw new CorporateCertificateIssuanceBlockedException(
        'certificate draft is tied to an unapproved registry record',
      );
    }

    return this.prisma.corporateCertificate.create({
      data: {
        profileId: input.profileId,
        certificateReference: input.certificateReference,
        label: input.label,
        status: CorporateCertificateStatus.ISSUED,
        issuedAt: new Date(),
        sourceRecordStatus: CorporateRegistryRecordStatus.APPROVED,
      },
    });
  }
}
