import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GovernmentServiceMaturityStatus,
  GovernmentServicePublicAvailability,
  ServiceActivationOutcome,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { S19_REASON_CODES } from '../s19.constants';

@Injectable()
export class ServiceRuntimeGateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async assertIntakeAllowed(governmentServiceVersionId: string): Promise<void> {
    const version = await this.prisma.governmentServiceVersion.findUnique({
      where: { id: governmentServiceVersionId },
      include: {
        activationRecords: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!version) {
      throw new ForbiddenException(S19_REASON_CODES.SERVICE_INTAKE_BLOCKED);
    }

    if (version.maturityStatus !== GovernmentServiceMaturityStatus.ACTIVE) {
      throw new ForbiddenException(S19_REASON_CODES.SERVICE_INTAKE_BLOCKED);
    }

    if (version.publicAvailability === GovernmentServicePublicAvailability.SUSPENDED) {
      throw new ForbiddenException(S19_REASON_CODES.SERVICE_INTAKE_BLOCKED);
    }

    const nodeEnv = this.configService.get<{ nodeEnv: string }>('app')?.nodeEnv ?? 'development';
    if (nodeEnv === 'production') {
      const latestActivation = version.activationRecords[0];
      const hasActivationEvidence =
        latestActivation?.outcome === ServiceActivationOutcome.ACTIVATED &&
        latestActivation.activationBasis.length > 0;
      if (!hasActivationEvidence) {
        throw new ForbiddenException(S19_REASON_CODES.ACTIVATION_EVIDENCE_REQUIRED);
      }
    }
  }

  async assertIssuanceAllowed(caseId: string): Promise<void> {
    const caseRecord = await this.prisma.case.findUnique({
      where: { id: caseId },
      include: { governmentServiceVersion: true },
    });

    if (!caseRecord) {
      throw new ForbiddenException(S19_REASON_CODES.SERVICE_ISSUANCE_BLOCKED);
    }

    const version = caseRecord.governmentServiceVersion;
    if (version.publicAvailability === GovernmentServicePublicAvailability.SUSPENDED) {
      throw new ForbiddenException(S19_REASON_CODES.SERVICE_ISSUANCE_BLOCKED);
    }

    if (version.maturityStatus !== GovernmentServiceMaturityStatus.ACTIVE) {
      throw new ForbiddenException(S19_REASON_CODES.SERVICE_ISSUANCE_BLOCKED);
    }
  }
}
