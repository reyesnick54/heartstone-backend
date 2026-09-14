import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { IntegrationApproval, IntegrationApprovalStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { IntegrationsValidationService } from '../common/integrations-validation.service';
import { RecordIntegrationApprovalDto } from '../dto/record-integration-approval.dto';

@Injectable()
export class IntegrationApprovalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validation: IntegrationsValidationService,
  ) {}

  async recordApproval(
    integrationVersionId: string,
    dto: RecordIntegrationApprovalDto,
  ): Promise<IntegrationApproval> {
    await this.validation.ensureIntegrationVersionExists(integrationVersionId);

    if (dto.status === IntegrationApprovalStatus.APPROVED && !dto.approvedByIdentityId) {
      throw new BadRequestException('Approved integration approval requires approver identity');
    }

    const existing = await this.prisma.integrationApproval.findUnique({
      where: {
        integrationVersionId_approvalType: {
          integrationVersionId,
          approvalType: dto.approvalType,
        },
      },
    });

    if (existing) {
      return this.prisma.integrationApproval.update({
        where: { id: existing.id },
        data: {
          status: dto.status,
          approvedByIdentityId: dto.approvedByIdentityId,
          approvedByOfficeholderId: dto.approvedByOfficeholderId,
          approvedAt: dto.status === IntegrationApprovalStatus.APPROVED ? new Date() : null,
          notes: dto.notes,
        },
      });
    }

    return this.prisma.integrationApproval.create({
      data: {
        integrationVersionId,
        approvalType: dto.approvalType,
        status: dto.status,
        approvedByIdentityId: dto.approvedByIdentityId,
        approvedByOfficeholderId: dto.approvedByOfficeholderId,
        approvedAt: dto.status === IntegrationApprovalStatus.APPROVED ? new Date() : null,
        notes: dto.notes,
      },
    });
  }

  async findByVersion(integrationVersionId: string): Promise<IntegrationApproval[]> {
    await this.validation.ensureIntegrationVersionExists(integrationVersionId);

    return this.prisma.integrationApproval.findMany({
      where: { integrationVersionId },
      orderBy: [{ approvalType: 'asc' }],
    });
  }

  async findOne(id: string): Promise<IntegrationApproval> {
    const record = await this.prisma.integrationApproval.findUnique({ where: { id } });

    if (!record) {
      throw new NotFoundException(`Integration approval with id "${id}" was not found`);
    }

    return record;
  }
}
