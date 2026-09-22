import { Injectable, NotFoundException } from '@nestjs/common';
import { ImmigrationCredentialLifecycleStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { resolveImmigrationCredentialLifecycle } from '../common/immigration-credential.util';

@Injectable()
export class ImmigrationCredentialService {
  constructor(private readonly prisma: PrismaService) {}

  async getVisaPermissionLifecycle(permissionId: string) {
    const permission = await this.prisma.visaPermissionRecord.findUnique({
      where: { id: permissionId },
    });
    if (!permission) {
      throw new NotFoundException('Visa permission record not found');
    }
    const effectiveStatus = resolveImmigrationCredentialLifecycle({
      lifecycleStatus: permission.lifecycleStatus,
      validUntil: permission.validUntil,
    });
    return { permission, effectiveStatus };
  }

  async getResidencyPermitLifecycle(permitId: string) {
    const permit = await this.prisma.residencyPermitRecord.findUnique({ where: { id: permitId } });
    if (!permit) {
      throw new NotFoundException('Residency permit record not found');
    }
    const effectiveStatus = resolveImmigrationCredentialLifecycle({
      lifecycleStatus: permit.lifecycleStatus,
      validUntil: permit.validUntil,
    });
    return { permit, effectiveStatus };
  }

  isExpiredCredential(status: ImmigrationCredentialLifecycleStatus): boolean {
    return status === ImmigrationCredentialLifecycleStatus.EXPIRED;
  }
}
