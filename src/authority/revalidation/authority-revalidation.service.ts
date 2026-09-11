import { Injectable } from '@nestjs/common';
import {
  AuthorityFunctionStatus,
  AuthorityGoverningSourceStatus,
  AuthorityRevalidationState,
  AuthorityRevalidationTrigger,
  SecurityAuditEventType,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { AuthorityAuditService } from '../audit/authority-audit.service';
import { AuthorityEvaluationRecordRepository } from '../evaluation/authority-evaluation-record.repository';

export interface RevalidationTriggerInput {
  trigger: AuthorityRevalidationTrigger;
  assignmentId?: string;
  functionId?: string;
  governingSourceId?: string;
  evaluationId?: string;
  triggerDetail?: string;
}

@Injectable()
export class AuthorityRevalidationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly records: AuthorityEvaluationRecordRepository,
    private readonly audit: AuthorityAuditService,
  ) {}

  async triggerRevalidation(input: RevalidationTriggerInput): Promise<void> {
    await this.prisma.authorityRevalidationMarker.create({
      data: {
        assignmentId: input.assignmentId,
        functionId: input.functionId,
        governingSourceId: input.governingSourceId,
        evaluationId: input.evaluationId,
        trigger: input.trigger,
        triggerDetail: input.triggerDetail,
      },
    });

    if (input.assignmentId) {
      await this.prisma.authorityAssignment.update({
        where: { id: input.assignmentId },
        data: { revalidationState: AuthorityRevalidationState.REQUIRES_REVALIDATION },
      });
    }

    if (input.evaluationId) {
      await this.records.findById(input.evaluationId);
    }

    await this.audit.record({
      eventType: SecurityAuditEventType.AUTHORITY_REVALIDATION_TRIGGERED,
      metadata: {
        trigger: input.trigger,
        assignmentId: input.assignmentId,
        functionId: input.functionId,
        governingSourceId: input.governingSourceId,
        evaluationId: input.evaluationId,
        triggerDetail: input.triggerDetail,
      },
    });
  }

  async onSourceAmended(governingSourceId: string, detail?: string): Promise<void> {
    const assignments = await this.prisma.authorityAssignment.findMany({
      where: { governingSourceId },
    });

    for (const assignment of assignments) {
      await this.triggerRevalidation({
        trigger: AuthorityRevalidationTrigger.SOURCE_AMENDMENT,
        assignmentId: assignment.id,
        functionId: assignment.functionId,
        governingSourceId,
        triggerDetail: detail,
      });
    }
  }

  async onSourceRevoked(governingSourceId: string, detail?: string): Promise<void> {
    const assignments = await this.prisma.authorityAssignment.findMany({
      where: { governingSourceId },
    });

    for (const assignment of assignments) {
      await this.triggerRevalidation({
        trigger: AuthorityRevalidationTrigger.SOURCE_REVOCATION,
        assignmentId: assignment.id,
        functionId: assignment.functionId,
        governingSourceId,
        triggerDetail: detail,
      });
    }
  }

  async onDelegationExpired(delegationId: string): Promise<void> {
    const evaluations = await this.records.findMany({ delegationId });
    for (const evaluation of evaluations) {
      if (evaluation.assignmentId) {
        await this.triggerRevalidation({
          trigger: AuthorityRevalidationTrigger.DELEGATION_CHANGE,
          assignmentId: evaluation.assignmentId,
          functionId: evaluation.functionId,
          evaluationId: evaluation.id,
          triggerDetail: `Delegation ${delegationId} expired`,
        });
      }
    }
  }

  async onFunctionSuspended(functionId: string): Promise<void> {
    const assignments = await this.prisma.authorityAssignment.findMany({
      where: { functionId },
    });

    for (const assignment of assignments) {
      await this.triggerRevalidation({
        trigger: AuthorityRevalidationTrigger.FUNCTION_LIFECYCLE_CHANGE,
        assignmentId: assignment.id,
        functionId,
        triggerDetail: 'Function suspended',
      });
    }

    await this.prisma.authorityFunction.update({
      where: { id: functionId },
      data: { status: AuthorityFunctionStatus.SUSPENDED },
    });

    await this.audit.record({
      eventType: SecurityAuditEventType.AUTHORITY_FUNCTION_SUSPENDED,
      metadata: { functionId },
    });
  }

  async findPendingRevalidations(): Promise<
    {
      assignmentId: string | null;
      functionId: string | null;
      governingSourceId: string | null;
      trigger: AuthorityRevalidationTrigger;
    }[]
  > {
    const markers = await this.prisma.authorityRevalidationMarker.findMany({
      where: { resolvedAt: null },
      orderBy: { createdAt: 'asc' },
    });

    return markers.map((marker) => ({
      assignmentId: marker.assignmentId,
      functionId: marker.functionId,
      governingSourceId: marker.governingSourceId,
      trigger: marker.trigger,
    }));
  }

  async markSourceSuperseded(oldSourceId: string, newSourceId: string): Promise<void> {
    await this.prisma.authorityGoverningSource.update({
      where: { id: oldSourceId },
      data: {
        status: AuthorityGoverningSourceStatus.SUPERSEDED,
        supersededById: newSourceId,
      },
    });

    await this.onSourceAmended(oldSourceId, `Superseded by ${newSourceId}`);
  }
}
