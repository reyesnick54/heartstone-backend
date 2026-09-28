import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { FunctionAuthorityLifecycleStatus } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { ABSEZ_CUSTOMS_DELEGATED_FUNCTION_CODE } from '../absez-s18f.constants';

@Injectable()
export class FreeZoneCustomsAuthorityService {
  constructor(private readonly prisma: PrismaService) {}

  async assertDelegatedCustomsFacilitationActive(
    delegatedFunctionCode: string = ABSEZ_CUSTOMS_DELEGATED_FUNCTION_CODE,
  ): Promise<void> {
    const record = await this.prisma.functionAuthorityRecord.findUnique({
      where: { code: delegatedFunctionCode },
      include: { dependencies: true },
    });

    if (!record) {
      throw new UnprocessableEntityException(
        `Delegated customs function ${delegatedFunctionCode} is not configured`,
      );
    }

    if (record.lifecycleStatus !== FunctionAuthorityLifecycleStatus.ACTIVE) {
      throw new UnprocessableEntityException(
        'Customs facilitation authority is not active; coordination must halt pending competent delegated instrument.',
      );
    }

    const blockingDependency = record.dependencies.find(
      (dependency) => dependency.blockingStatus === 'BLOCKING' && dependency.status === 'ACTIVE',
    );
    if (blockingDependency && record.requiresDelegation) {
      const governingLinks = await this.prisma.functionGoverningSource.findMany({
        where: { functionAuthorityRecordId: record.id, isPrimary: true },
        include: { governingSource: true },
      });
      const unauthenticated = governingLinks.some(
        (link) => link.governingSource.authenticatedAt == null,
      );
      if (unauthenticated) {
        throw new UnprocessableEntityException(
          'Governing delegating instrument is not authenticated; customs coordination cannot proceed as operational.',
        );
      }
    }
  }
}
