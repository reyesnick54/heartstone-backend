import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CatalogServiceType,
  GovernmentServiceMaturityStatus,
  GovernmentServicePublicAvailability,
  ServiceActivationOutcome,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { SERVICE_ACTIVATION_BASIS } from './service-catalog-governance.constants';
import { ServiceReadinessService } from './service-readiness.service';

export interface ServicePublicationGovernanceRequest {
  governmentServiceVersionId: string;
  actorIdentityId: string;
  targetPublicAvailability: GovernmentServicePublicAvailability;
  reason?: string;
  effectiveAt?: Date;
}

@Injectable()
export class ServicePublicationGovernanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly readinessService: ServiceReadinessService,
  ) {}

  async publish(request: ServicePublicationGovernanceRequest) {
    const version = await this.prisma.governmentServiceVersion.findUnique({
      where: { id: request.governmentServiceVersionId },
      include: { governmentService: true },
    });
    if (!version) {
      throw new NotFoundException(
        `GovernmentServiceVersion "${request.governmentServiceVersionId}" was not found`,
      );
    }

    if (version.maturityStatus === GovernmentServiceMaturityStatus.SUSPENDED) {
      throw new BadRequestException(
        'Suspended services cannot be republished without reactivation',
      );
    }

    if (request.targetPublicAvailability === GovernmentServicePublicAvailability.ACTIVE) {
      const readiness = await this.readinessService.assessReadiness(
        request.governmentServiceVersionId,
        request.effectiveAt ?? new Date(),
      );
      if (!readiness.technicallyReady) {
        throw new BadRequestException(
          'Public availability publication requires technical readiness',
        );
      }
      if (
        version.governmentService.catalogServiceType === CatalogServiceType.APPLICATION &&
        version.maturityStatus !== GovernmentServiceMaturityStatus.ACTIVE &&
        version.publicAvailability !== GovernmentServicePublicAvailability.PILOT_ONLY
      ) {
        throw new BadRequestException(
          'Application-capable publication requires operational or pilot activation',
        );
      }
    }

    const effectiveAt = request.effectiveAt ?? new Date();
    const record = await this.prisma.$transaction(async (tx) => {
      await tx.governmentServiceVersion.update({
        where: { id: version.id },
        data: { publicAvailability: request.targetPublicAvailability },
      });

      return tx.serviceActivationRecord.create({
        data: {
          governmentServiceVersionId: version.id,
          priorMaturityStatus: version.maturityStatus,
          newMaturityStatus: version.maturityStatus,
          priorPublicAvailability: version.publicAvailability,
          newPublicAvailability: request.targetPublicAvailability,
          actorIdentityId: request.actorIdentityId,
          activationBasis: SERVICE_ACTIVATION_BASIS.PUBLICATION,
          effectiveAt,
          scopeLimitations: [],
          reason: request.reason,
          outcome: ServiceActivationOutcome.ACTIVATED,
        },
      });
    });

    return {
      governmentServiceVersionId: version.id,
      priorPublicAvailability: version.publicAvailability,
      newPublicAvailability: request.targetPublicAvailability,
      activationRecordId: record.id,
    };
  }
}
