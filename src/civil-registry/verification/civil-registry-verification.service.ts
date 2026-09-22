import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CivilRegistryCertificateStatus,
  type CivilRegistryCertificateVerification,
  CivilRegistryVerificationValidity,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CIVIL_REGISTRY_DISCLAIMERS } from '../civil-registry.constants';

export interface PublicCivilCertificateVerificationResponse {
  verificationReference: string;
  validityStatus: CivilRegistryVerificationValidity;
  publicStatusLabel: string;
  issuer: string;
  certificateType: string;
  documentHash: string;
  qrTokenReference?: string | null;
  registryVersionNumber?: number;
  verifiedAt: string;
  minimalDisclosureDisclaimer: string;
}

@Injectable()
export class CivilRegistryVerificationService {
  constructor(private readonly prisma: PrismaService) {}

  async verifyPublic(
    verificationCode: string,
  ): Promise<PublicCivilCertificateVerificationResponse> {
    const record = await this.prisma.civilRegistryCertificateVerification.findUnique({
      where: { verificationCode },
      include: {
        certificate: {
          include: {
            registryVersion: { select: { versionNumber: true, recordStateHash: true } },
            vitalRecord: { select: { id: true, recordNumber: true, isSealed: true } },
          },
        },
        issuerInstitution: { select: { name: true } },
      },
    });

    if (!record) {
      throw new NotFoundException('Verification reference not found');
    }

    const validityStatus = this.resolveValidity(record);

    return {
      verificationReference: record.verificationReference,
      validityStatus,
      publicStatusLabel: record.publicStatusLabel,
      issuer: record.issuerInstitution.name,
      certificateType: record.certificate.certificateType,
      documentHash: record.documentHash,
      qrTokenReference: record.qrTokenReference,
      registryVersionNumber: record.certificate.registryVersion.versionNumber,
      verifiedAt: new Date().toISOString(),
      minimalDisclosureDisclaimer: CIVIL_REGISTRY_DISCLAIMERS.verificationMinimalDisclosure,
    };
  }

  async verifyByReference(
    verificationReference: string,
  ): Promise<PublicCivilCertificateVerificationResponse> {
    const record = await this.prisma.civilRegistryCertificateVerification.findUnique({
      where: { verificationReference },
    });
    if (!record) {
      throw new NotFoundException('Verification reference not found');
    }
    return this.verifyPublic(record.verificationCode);
  }

  private resolveValidity(
    record: CivilRegistryCertificateVerification & {
      certificate: {
        status: CivilRegistryCertificateStatus;
        registryVersion: { recordStateHash: string };
      };
    },
  ): CivilRegistryVerificationValidity {
    if (record.validityStatus === CivilRegistryVerificationValidity.REVOKED) {
      return CivilRegistryVerificationValidity.REVOKED;
    }

    if (record.certificate.status === CivilRegistryCertificateStatus.SUPERSEDED) {
      return CivilRegistryVerificationValidity.SUPERSEDED;
    }

    if (record.certificate.status !== CivilRegistryCertificateStatus.ISSUED) {
      return CivilRegistryVerificationValidity.UNKNOWN;
    }

    return CivilRegistryVerificationValidity.VALID;
  }
}
