import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { RedressMatterStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { REDRESS_MATTER_NUMBER_PREFIX } from '../redress.constants';

export interface CreateRedressMatterInput {
  filerIdentityId: string;
  caseId?: string;
  masterAdministrativeFileId?: string;
  challengedDecisionId?: string;
  challengedInstrumentId?: string;
  representativeAuthorityId?: string;
  routeVersionId?: string;
}

@Injectable()
export class RedressMatterService {
  constructor(private readonly prisma: PrismaService) {}

  async createMatter(input: CreateRedressMatterInput) {
    if (input.challengedDecisionId) {
      const decision = await this.prisma.governmentDecision.findUnique({
        where: { id: input.challengedDecisionId },
      });

      if (!decision) {
        throw new NotFoundException(`GovernmentDecision ${input.challengedDecisionId} not found`);
      }

      if (input.caseId && decision.caseId !== input.caseId) {
        throw new BadRequestException('Challenged decision must belong to the specified case');
      }
    }

    if (input.challengedInstrumentId) {
      const instrument = await this.prisma.officialInstrument.findUnique({
        where: { id: input.challengedInstrumentId },
      });

      if (!instrument) {
        throw new NotFoundException(`OfficialInstrument ${input.challengedInstrumentId} not found`);
      }
    }

    const matterNumber = `${REDRESS_MATTER_NUMBER_PREFIX}-${String(Date.now())}-${input.filerIdentityId.slice(0, 8)}`;

    return this.prisma.redressMatter.create({
      data: {
        matterNumber,
        filerIdentityId: input.filerIdentityId,
        caseId: input.caseId,
        masterAdministrativeFileId: input.masterAdministrativeFileId,
        challengedDecisionId: input.challengedDecisionId,
        challengedInstrumentId: input.challengedInstrumentId,
        representativeAuthorityId: input.representativeAuthorityId,
        routeVersionId: input.routeVersionId,
        status: RedressMatterStatus.OPEN,
      },
      include: {
        challengedDecision: true,
        challengedInstrument: true,
        routeVersion: { include: { routeDefinition: true } },
      },
    });
  }

  async findById(id: string) {
    const matter = await this.prisma.redressMatter.findUnique({
      where: { id },
      include: {
        filings: { orderBy: { createdAt: 'desc' } },
        standingAssessments: { orderBy: { createdAt: 'desc' } },
        timelinessAssessments: { orderBy: { createdAt: 'desc' } },
        redressDecisions: { orderBy: { createdAt: 'desc' } },
        routeVersion: { include: { routeDefinition: true } },
        challengedDecision: true,
        challengedInstrument: true,
      },
    });

    if (!matter) {
      throw new NotFoundException(`RedressMatter ${id} not found`);
    }

    return matter;
  }

  async updateStatus(matterId: string, status: RedressMatterStatus) {
    return this.prisma.redressMatter.update({
      where: { id: matterId },
      data: {
        status,
        ...(status === RedressMatterStatus.CLOSED ? { closedAt: new Date() } : {}),
      },
    });
  }

  async linkRouteVersion(matterId: string, routeVersionId: string) {
    await this.findById(matterId);

    return this.prisma.redressMatter.update({
      where: { id: matterId },
      data: { routeVersionId },
    });
  }
}
