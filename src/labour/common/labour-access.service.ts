import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { RepresentativeAuthorityStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { LABOUR_REASON_CODES } from '../labour.constants';
import { LabourBoundaryService } from './labour-boundary.service';

export interface WorkerSelfAccessContext {
  accessorIdentityId: string;
  workerProfileReferenceId: string;
  endpoint: string;
}

export interface EmployerWorkforceAccessContext {
  accessorIdentityId: string;
  employerRegistryRecordId: string;
  endpoint: string;
  representativeAuthorityId?: string;
}

@Injectable()
export class LabourAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: LabourBoundaryService,
  ) {}

  async assertWorkerSelfAccess(context: WorkerSelfAccessContext): Promise<void> {
    const profile = await this.prisma.workerProfileReference.findUnique({
      where: { id: context.workerProfileReferenceId },
    });
    if (!profile) {
      throw new NotFoundException('Worker profile reference not found');
    }

    this.boundary.assertCrossWorkerAccessBlocked(
      context.accessorIdentityId,
      profile.workerIdentityId,
    );
  }

  async assertEmployerWorkforceAccess(context: EmployerWorkforceAccessContext): Promise<void> {
    const employer = await this.prisma.employerRegistryRecord.findUnique({
      where: { id: context.employerRegistryRecordId },
      include: { organization: true },
    });
    if (!employer) {
      throw new NotFoundException('Employer registry record not found');
    }

    const directOrgIdentity = await this.prisma.identity.findFirst({
      where: {
        id: context.accessorIdentityId,
        organizationId: employer.organizationId,
      },
    });
    if (directOrgIdentity) {
      return;
    }

    if (!context.representativeAuthorityId) {
      throw new ForbiddenException(LABOUR_REASON_CODES.REPRESENTATIVE_AUTHORITY_REQUIRED);
    }

    const authority = await this.prisma.representativeAuthority.findUnique({
      where: { id: context.representativeAuthorityId },
    });
    const now = new Date();
    const active =
      authority?.status === RepresentativeAuthorityStatus.ACTIVE &&
      authority.identityId === context.accessorIdentityId &&
      authority.organizationId === employer.organizationId &&
      authority.effectiveFrom <= now &&
      (authority.effectiveUntil == null || authority.effectiveUntil > now);

    if (!active) {
      throw new ForbiddenException(LABOUR_REASON_CODES.REVOKED_REPRESENTATION_BLOCKED);
    }
  }
}
