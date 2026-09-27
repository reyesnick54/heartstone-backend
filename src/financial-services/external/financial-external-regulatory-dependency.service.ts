import { createHash, randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import {
  FinancialExternalRegulatoryDependencyRecordedBy,
  FinancialExternalRegulatoryDependencyStatus,
  FinancialServicesActorPersona,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { FinancialServicesBoundaryService } from '../common/financial-services-boundary.service';

@Injectable()
export class FinancialExternalRegulatoryDependencyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: FinancialServicesBoundaryService,
  ) {}

  async assertLicenceDecisionAllowed(regulatedEntityProfileId: string): Promise<void> {
    const dependencies = await this.prisma.financialExternalRegulatoryDependency.findMany({
      where: { regulatedEntityProfileId },
    });
    this.boundary.assertExternalDependenciesResolved(dependencies);
  }

  async recordExternalDependency(
    actorPersona: FinancialServicesActorPersona,
    input: {
      regulatedEntityProfileId?: string;
      licenceApplicationProfileId?: string;
      externalAuthorityId: string;
      dependencyCode: string;
      dependencyLabel: string;
      status?: FinancialExternalRegulatoryDependencyStatus;
      blocksAbsezLicenceDecision?: boolean;
      blocksAbsezIssuance?: boolean;
      isAuthenticated: boolean;
      authenticatedPayload?: Record<string, unknown>;
      recordedBy: FinancialExternalRegulatoryDependencyRecordedBy;
      recordedByIdentityId?: string;
      retainedNationalDeterminationId?: string;
      clientPayload?: Record<string, unknown>;
    },
  ) {
    if (input.clientPayload) {
      this.boundary.rejectApplicantForgedExternalDetermination(input.clientPayload, actorPersona);
    }

    const authenticatedPayloadHash = input.authenticatedPayload
      ? createHash('sha256').update(JSON.stringify(input.authenticatedPayload)).digest('hex')
      : undefined;

    return this.prisma.financialExternalRegulatoryDependency.create({
      data: {
        id: randomUUID(),
        regulatedEntityProfileId: input.regulatedEntityProfileId,
        licenceApplicationProfileId: input.licenceApplicationProfileId,
        externalAuthorityId: input.externalAuthorityId,
        dependencyCode: input.dependencyCode,
        dependencyLabel: input.dependencyLabel,
        status: input.status ?? FinancialExternalRegulatoryDependencyStatus.AWAITING_EXTERNAL_DETERMINATION,
        blocksAbsezLicenceDecision: input.blocksAbsezLicenceDecision ?? true,
        blocksAbsezIssuance: input.blocksAbsezIssuance ?? true,
        isAuthenticated: input.isAuthenticated,
        authenticatedPayloadHash,
        recordedBy: input.recordedBy,
        recordedByIdentityId: input.recordedByIdentityId,
        retainedNationalDeterminationId: input.retainedNationalDeterminationId,
      },
    });
  }

  async countAwaitingExternal(regulatedEntityProfileId: string): Promise<number> {
    return this.prisma.financialExternalRegulatoryDependency.count({
      where: {
        regulatedEntityProfileId,
        blocksAbsezLicenceDecision: true,
        status: {
          in: [
            FinancialExternalRegulatoryDependencyStatus.PENDING,
            FinancialExternalRegulatoryDependencyStatus.AWAITING_EXTERNAL_DETERMINATION,
            FinancialExternalRegulatoryDependencyStatus.BLOCKED,
          ],
        },
      },
    });
  }
}
