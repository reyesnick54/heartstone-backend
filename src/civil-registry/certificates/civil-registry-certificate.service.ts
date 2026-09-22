import { createHash } from 'node:crypto';

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CivilRegistryCertificateStatus,
  CivilRegistryCertificateType,
  CivilRegistryRecordStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { generateVerificationCode } from '../../decisions-issuance/common/verification-code.util';
import { CivilRegistryAccessService } from '../access/civil-registry-access.service';
import { CIVIL_REGISTRY_DISCLAIMERS } from '../civil-registry.constants';

export interface RequestCertificateInput {
  identityId: string;
  vitalRecordId: string;
  certificateType: CivilRegistryCertificateType;
  requestApplicationId?: string;
  issuanceCaseId?: string;
}

export interface IssueCertificateInput {
  certificateId: string;
  officialIdentityId: string;
  issuerInstitutionId: string;
  officialInstrumentId?: string;
}

@Injectable()
export class CivilRegistryCertificateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: CivilRegistryAccessService,
  ) {}

  async requestCertificate(input: RequestCertificateInput) {
    const record = await this.access.findEntitledRecordById(input.identityId, input.vitalRecordId);
    if (!record) {
      throw new NotFoundException('Vital record not found or not accessible');
    }

    if (
      record.status !== CivilRegistryRecordStatus.OFFICIAL &&
      record.status !== CivilRegistryRecordStatus.CORRECTED
    ) {
      throw new BadRequestException(
        'Certificates can only be requested against official vital records',
      );
    }

    if (!record.currentVersionId) {
      throw new BadRequestException('Vital record has no versioned registry state');
    }

    return this.prisma.civilRegistryCertificate.create({
      data: {
        vitalRecordId: record.id,
        registryVersionId: record.currentVersionId,
        certificateType: input.certificateType,
        status: CivilRegistryCertificateStatus.PENDING_ISSUANCE,
        requestApplicationId: input.requestApplicationId,
        issuanceCaseId: input.issuanceCaseId,
      },
    });
  }

  assertCitizenCannotIssueCertificate(): void {
    throw new ForbiddenException(
      'Citizens cannot self-issue civil certificates. Issuance requires evaluated official authority.',
    );
  }

  async issueCertificate(input: IssueCertificateInput) {
    const certificate = await this.prisma.civilRegistryCertificate.findUnique({
      where: { id: input.certificateId },
      include: {
        registryVersion: true,
        vitalRecord: { include: { institution: true } },
      },
    });

    if (!certificate) {
      throw new NotFoundException(`Certificate ${input.certificateId} not found`);
    }

    if (certificate.status !== CivilRegistryCertificateStatus.PENDING_ISSUANCE) {
      throw new BadRequestException('Certificate is not pending issuance');
    }

    const verificationReference = `CIV-VRF-${certificate.id.slice(0, 8).toUpperCase()}`;
    const verificationCode = generateVerificationCode();
    const documentHash = createHash('sha256')
      .update(
        `${certificate.registryVersion.recordStateHash}:${certificate.certificateType}:${certificate.id}`,
      )
      .digest('hex');

    return this.prisma.$transaction(async (tx) => {
      const issued = await tx.civilRegistryCertificate.update({
        where: { id: certificate.id },
        data: {
          status: CivilRegistryCertificateStatus.ISSUED,
          issuedAt: new Date(),
          issuedByOfficialIdentityId: input.officialIdentityId,
          officialInstrumentId: input.officialInstrumentId,
        },
      });

      const verification = await tx.civilRegistryCertificateVerification.create({
        data: {
          certificateId: certificate.id,
          verificationReference,
          verificationCode,
          documentHash,
          qrTokenReference: `qr:${verificationReference}`,
          issuerInstitutionId: input.issuerInstitutionId,
          publicStatusLabel: 'Issued — template verification only',
        },
      });

      return {
        certificate: issued,
        verification,
        registryVersionId: certificate.registryVersionId,
        disclaimer: CIVIL_REGISTRY_DISCLAIMERS.verificationMinimalDisclosure,
      };
    });
  }
}
