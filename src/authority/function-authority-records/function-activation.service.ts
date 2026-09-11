import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FunctionAuthorityLifecycleStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ActivateFunctionAuthorityRecordDto } from './dto/activate-function-authority-record.dto';
import { FunctionAuthorityRecordResponseDto } from './dto/function-authority-record-response.dto';
import { FunctionAuthorityRecordsService } from './function-authority-records.service';

@Injectable()
export class FunctionActivationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly recordsService: FunctionAuthorityRecordsService,
  ) {}

  async activate(
    id: string,
    dto: ActivateFunctionAuthorityRecordDto,
  ): Promise<FunctionAuthorityRecordResponseDto> {
    const existing = await this.prisma.functionAuthorityRecord.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`FunctionAuthorityRecord "${id}" was not found`);
    }

    if (existing.lifecycleStatus === FunctionAuthorityLifecycleStatus.ACTIVE) {
      throw new BadRequestException('Function is already active');
    }

    if (
      existing.lifecycleStatus === FunctionAuthorityLifecycleStatus.ARCHIVED ||
      existing.lifecycleStatus === FunctionAuthorityLifecycleStatus.SUSPENDED
    ) {
      throw new BadRequestException(
        `Cannot activate function in status ${existing.lifecycleStatus}`,
      );
    }

    const governingSourceCount = await this.prisma.functionGoverningSource.count({
      where: { functionAuthorityRecordId: id },
    });
    if (governingSourceCount === 0) {
      throw new BadRequestException('Cannot activate function without governing source linkage');
    }

    const assignmentCount = await this.prisma.functionAuthorityAssignment.count({
      where: { functionAuthorityRecordId: id },
    });
    if (assignmentCount === 0) {
      throw new BadRequestException('Cannot activate function without institutional assignment');
    }

    const actionRightCount = await this.prisma.authorityActionRight.count({
      where: { functionAuthorityRecordId: id, permitted: true },
    });
    if (actionRightCount === 0) {
      throw new BadRequestException('Cannot activate function without permitted action rights');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const record = await tx.functionAuthorityRecord.update({
        where: { id },
        data: {
          lifecycleStatus: FunctionAuthorityLifecycleStatus.ACTIVE,
          activatedAt: new Date(),
          activatedByIdentityId: dto.actorIdentityId,
        },
      });

      await tx.functionActivationAudit.create({
        data: {
          functionAuthorityRecordId: id,
          previousStatus: existing.lifecycleStatus,
          newStatus: FunctionAuthorityLifecycleStatus.ACTIVE,
          actorIdentityId: dto.actorIdentityId,
          reason: dto.reason,
        },
      });

      return record;
    });

    return this.recordsService.toResponse(updated);
  }

  async suspend(
    id: string,
    dto: ActivateFunctionAuthorityRecordDto,
  ): Promise<FunctionAuthorityRecordResponseDto> {
    const existing = await this.prisma.functionAuthorityRecord.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`FunctionAuthorityRecord "${id}" was not found`);
    }

    if (existing.lifecycleStatus !== FunctionAuthorityLifecycleStatus.ACTIVE) {
      throw new BadRequestException('Only active functions can be suspended');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const record = await tx.functionAuthorityRecord.update({
        where: { id },
        data: {
          lifecycleStatus: FunctionAuthorityLifecycleStatus.SUSPENDED,
          suspendedAt: new Date(),
        },
      });

      await tx.functionActivationAudit.create({
        data: {
          functionAuthorityRecordId: id,
          previousStatus: existing.lifecycleStatus,
          newStatus: FunctionAuthorityLifecycleStatus.SUSPENDED,
          actorIdentityId: dto.actorIdentityId,
          reason: dto.reason,
        },
      });

      return record;
    });

    return this.recordsService.toResponse(updated);
  }
}
