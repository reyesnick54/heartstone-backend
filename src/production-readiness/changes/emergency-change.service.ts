import { Injectable } from '@nestjs/common';
import { EmergencyChangeStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ProductionReadinessBoundaryService } from '../common/production-readiness-boundary.service';

@Injectable()
export class EmergencyChangeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ProductionReadinessBoundaryService,
  ) {}

  async createEmergencyChange(input: {
    incidentRef: string;
    necessity: string;
    scope: string;
    authorizedActorIdentityId: string;
    isTemporary?: boolean;
    riskAssessment?: Record<string, unknown>;
    rollbackPlanId?: string;
    retrospectiveDeadline: Date;
    attemptsAuthorityAlteration?: boolean;
  }) {
    this.boundary.assertEmergencyChangeCannotAlterAuthority(
      input.attemptsAuthorityAlteration ?? false,
    );

    return this.prisma.emergencyChange.create({
      data: {
        incidentRef: input.incidentRef,
        necessity: input.necessity,
        scope: input.scope,
        authorizedActorIdentityId: input.authorizedActorIdentityId,
        isTemporary: input.isTemporary ?? true,
        riskAssessment: (input.riskAssessment ?? {}) as Prisma.InputJsonValue,
        rollbackPlanId: input.rollbackPlanId,
        retrospectiveDeadline: input.retrospectiveDeadline,
        status: EmergencyChangeStatus.ACTIVE,
        cannotAlterInstitutionalAuthority: true,
      },
    });
  }

  async expireOverdueChanges() {
    const overdue = await this.prisma.emergencyChange.findMany({
      where: {
        status: EmergencyChangeStatus.ACTIVE,
        retrospectiveDeadline: { lt: new Date() },
      },
    });

    for (const change of overdue) {
      this.boundary.assertEmergencyChangeNotExpired(change.retrospectiveDeadline, change.status);
    }

    await this.prisma.emergencyChange.updateMany({
      where: {
        status: EmergencyChangeStatus.ACTIVE,
        retrospectiveDeadline: { lt: new Date() },
      },
      data: { status: EmergencyChangeStatus.EXPIRED },
    });

    return overdue.length;
  }

  async completeRetrospectiveReview(
    emergencyChangeId: string,
    accepted: boolean,
    postChangeReviewNotes: string,
  ) {
    return this.prisma.emergencyChange.update({
      where: { id: emergencyChangeId },
      data: {
        status: accepted
          ? EmergencyChangeStatus.RETROSPECTIVE_ACCEPTED
          : EmergencyChangeStatus.RETROSPECTIVE_REJECTED,
        postChangeReviewNotes,
      },
    });
  }
}
