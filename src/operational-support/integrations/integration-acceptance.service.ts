import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  IntegrationAcceptanceRecord,
  IntegrationAcceptanceStatus,
  IntegrationDefinitionStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import {
  INTEGRATION_ACCEPTANCE_STATUS_ORDER,
  PROGRESSIVE_ACCEPTANCE_STATUSES,
} from '../operational-support.constants';

export interface RecordAcceptanceInput {
  integrationDefinitionId: string;
  acceptanceStatus: IntegrationAcceptanceStatus;
  assessedByIdentityId?: string;
  notes?: string;
  validUntil?: Date;
}

@Injectable()
export class IntegrationAcceptanceService {
  constructor(private readonly prisma: PrismaService) {}

  async recordAcceptance(input: RecordAcceptanceInput): Promise<IntegrationAcceptanceRecord> {
    const definition = await this.prisma.integrationDefinition.findUnique({
      where: { id: input.integrationDefinitionId },
      include: {
        acceptanceRecords: { orderBy: { assessedAt: 'desc' } },
      },
    });

    if (!definition) {
      throw new NotFoundException(
        `IntegrationDefinition ${input.integrationDefinitionId} not found`,
      );
    }

    this.assertStatusProgression(definition.acceptanceRecords, input.acceptanceStatus);

    const record = await this.prisma.integrationAcceptanceRecord.create({
      data: {
        integrationDefinitionId: input.integrationDefinitionId,
        acceptanceStatus: input.acceptanceStatus,
        assessedByIdentityId: input.assessedByIdentityId,
        notes: input.notes,
        validUntil: input.validUntil,
      },
    });

    const nextDefinitionStatus = this.mapAcceptanceToDefinitionStatus(input.acceptanceStatus);
    if (nextDefinitionStatus) {
      await this.prisma.integrationDefinition.update({
        where: { id: input.integrationDefinitionId },
        data: { status: nextDefinitionStatus },
      });
    }

    return record;
  }

  async getAcceptanceDossier(integrationDefinitionId: string): Promise<{
    currentStatus: IntegrationAcceptanceStatus | null;
    records: IntegrationAcceptanceRecord[];
  }> {
    const records = await this.prisma.integrationAcceptanceRecord.findMany({
      where: { integrationDefinitionId },
      orderBy: { assessedAt: 'asc' },
    });

    const currentStatus = this.deriveCurrentStatus(records);
    return { currentStatus, records };
  }

  private assertStatusProgression(
    existingRecords: IntegrationAcceptanceRecord[],
    requestedStatus: IntegrationAcceptanceStatus,
  ): void {
    if (
      requestedStatus === IntegrationAcceptanceStatus.SUSPENDED ||
      requestedStatus === IntegrationAcceptanceStatus.REVALIDATION_REQUIRED
    ) {
      return;
    }

    const currentStatus = this.deriveCurrentStatus(existingRecords);
    if (!currentStatus) {
      if (requestedStatus !== IntegrationAcceptanceStatus.TECHNICALLY_CONNECTED) {
        throw new BadRequestException(
          'Initial acceptance must begin at TECHNICALLY_CONNECTED; lower states cannot establish higher states',
        );
      }
      return;
    }

    const currentOrder = INTEGRATION_ACCEPTANCE_STATUS_ORDER[currentStatus];
    const requestedOrder = INTEGRATION_ACCEPTANCE_STATUS_ORDER[requestedStatus];

    if (requestedOrder <= currentOrder) {
      throw new BadRequestException(
        `Acceptance status ${requestedStatus} does not advance beyond current ${currentStatus}`,
      );
    }

    const expectedNext = PROGRESSIVE_ACCEPTANCE_STATUSES.find(
      (status) => INTEGRATION_ACCEPTANCE_STATUS_ORDER[status] === currentOrder + 1,
    );

    if (expectedNext !== requestedStatus) {
      throw new BadRequestException(
        `Acceptance must progress sequentially; expected ${expectedNext ?? 'none'} but received ${requestedStatus}`,
      );
    }
  }

  private deriveCurrentStatus(
    records: IntegrationAcceptanceRecord[],
  ): IntegrationAcceptanceStatus | null {
    if (records.length === 0) {
      return null;
    }

    const progressive = records
      .map((record) => record.acceptanceStatus)
      .filter((status): status is (typeof PROGRESSIVE_ACCEPTANCE_STATUSES)[number] =>
        (PROGRESSIVE_ACCEPTANCE_STATUSES as readonly IntegrationAcceptanceStatus[]).includes(
          status,
        ),
      );

    if (progressive.length === 0) {
      return records.at(-1)?.acceptanceStatus ?? null;
    }

    const firstProgressive = progressive[0];
    if (!firstProgressive) {
      return records.at(-1)?.acceptanceStatus ?? null;
    }

    return progressive.reduce((highest, status) => {
      return INTEGRATION_ACCEPTANCE_STATUS_ORDER[status] >
        INTEGRATION_ACCEPTANCE_STATUS_ORDER[highest]
        ? status
        : highest;
    }, firstProgressive);
  }

  private mapAcceptanceToDefinitionStatus(
    acceptanceStatus: IntegrationAcceptanceStatus,
  ): IntegrationDefinitionStatus | null {
    switch (acceptanceStatus) {
      case IntegrationAcceptanceStatus.TECHNICALLY_CONNECTED:
        return IntegrationDefinitionStatus.PENDING_ACCEPTANCE;
      case IntegrationAcceptanceStatus.TESTED:
      case IntegrationAcceptanceStatus.TECHNICALLY_READY:
        return IntegrationDefinitionStatus.PENDING_ACCEPTANCE;
      case IntegrationAcceptanceStatus.INSTITUTIONALLY_ACCEPTED:
        return IntegrationDefinitionStatus.ACCEPTED;
      case IntegrationAcceptanceStatus.OPERATIONALLY_ACTIVE:
        return IntegrationDefinitionStatus.ACTIVE;
      case IntegrationAcceptanceStatus.SUSPENDED:
        return IntegrationDefinitionStatus.SUSPENDED;
      case IntegrationAcceptanceStatus.REVALIDATION_REQUIRED:
        return IntegrationDefinitionStatus.PENDING_ACCEPTANCE;
      default:
        return null;
    }
  }
}
