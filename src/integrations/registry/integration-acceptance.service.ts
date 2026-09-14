import { BadRequestException, Injectable } from '@nestjs/common';
import {
  IntegrationAcceptanceRecord,
  IntegrationAcceptanceState,
  IntegrationApprovalStatus,
  IntegrationApprovalType,
  IntegrationVersionStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { IntegrationsBoundaryService } from '../common/integrations-boundary.service';
import { RecordAcceptanceStateDto } from '../dto/record-acceptance-state.dto';
import { IntegrationVersionsService } from './integration-versions.service';

@Injectable()
export class IntegrationAcceptanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: IntegrationsBoundaryService,
    private readonly versionsService: IntegrationVersionsService,
  ) {}

  async recordAcceptanceState(
    integrationVersionId: string,
    dto: RecordAcceptanceStateDto,
  ): Promise<IntegrationAcceptanceRecord> {
    const version = await this.versionsService.findOne(integrationVersionId);

    if (dto.acceptanceState === IntegrationAcceptanceState.TECHNICALLY_CONNECTED) {
      this.boundary.rejectTechnicalConnectionCannotSetAuthoritative(
        dto as unknown as Record<string, unknown>,
      );
    }

    if (dto.acceptanceState === IntegrationAcceptanceState.ACTIVE) {
      const achievedStates = await this.getAchievedStates(integrationVersionId);
      const withCurrent = [...achievedStates, dto.acceptanceState];
      this.boundary.assertActiveRequiresAcceptanceGates(withCurrent);
      await this.assertRequiredApprovals(integrationVersionId);
    }

    return this.prisma.$transaction(async (tx) => {
      const record = await tx.integrationAcceptanceRecord.create({
        data: {
          integrationVersionId,
          acceptanceState: dto.acceptanceState,
          achievedByIdentityId: dto.achievedByIdentityId,
          achievedByOfficeholderId: dto.achievedByOfficeholderId,
          previousState: version.currentAcceptanceState,
          notes: dto.notes,
        },
      });

      const updateData: {
        currentAcceptanceState: IntegrationAcceptanceState;
        status?: IntegrationVersionStatus;
        acceptedAt?: Date;
      } = {
        currentAcceptanceState: dto.acceptanceState,
      };

      if (dto.acceptanceState === IntegrationAcceptanceState.INSTITUTIONALLY_ACCEPTED) {
        updateData.acceptedAt = new Date();
      }

      if (dto.acceptanceState === IntegrationAcceptanceState.ACTIVE) {
        updateData.status = IntegrationVersionStatus.ACTIVE;
      }

      if (dto.acceptanceState === IntegrationAcceptanceState.SUSPENDED) {
        updateData.status = IntegrationVersionStatus.SUSPENDED;
      }

      if (dto.acceptanceState === IntegrationAcceptanceState.RETIRED) {
        updateData.status = IntegrationVersionStatus.RETIRED;
      }

      await tx.integrationVersion.update({
        where: { id: integrationVersionId },
        data: updateData,
      });

      return record;
    });
  }

  async getAcceptanceHistory(integrationVersionId: string): Promise<IntegrationAcceptanceRecord[]> {
    await this.versionsService.findOne(integrationVersionId);

    return this.prisma.integrationAcceptanceRecord.findMany({
      where: { integrationVersionId },
      orderBy: [{ achievedAt: 'asc' }],
    });
  }

  async getAchievedStates(integrationVersionId: string): Promise<IntegrationAcceptanceState[]> {
    const records = await this.getAcceptanceHistory(integrationVersionId);
    return records.map((record) => record.acceptanceState);
  }

  private async assertRequiredApprovals(integrationVersionId: string): Promise<void> {
    const requiredTypes: IntegrationApprovalType[] = [
      IntegrationApprovalType.SECURITY,
      IntegrationApprovalType.PRIVACY,
      IntegrationApprovalType.INSTITUTIONAL,
    ];

    const approvals = await this.prisma.integrationApproval.findMany({
      where: { integrationVersionId },
    });

    for (const required of requiredTypes) {
      const approval = approvals.find((item) => item.approvalType === required);

      if (approval?.status !== IntegrationApprovalStatus.APPROVED) {
        throw new BadRequestException(
          `Integration cannot become ACTIVE without approved ${required} approval`,
        );
      }
    }
  }
}
