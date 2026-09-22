import { randomUUID } from 'node:crypto';

import { Injectable, NotFoundException } from '@nestjs/common';
import { LabourActorPersona, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { LabourBoundaryService } from '../common/labour-boundary.service';
import { EMPLOYMENT_RELATIONSHIP_NUMBER_PREFIX } from '../labour.constants';

export interface CreateEmploymentRelationshipInput {
  employerRegistryRecordId: string;
  workerProfileReferenceId: string;
  roleTitle: string;
  occupationClassificationId?: string;
  startDate?: Date;
}

export interface UpdateEmploymentRelationshipInput {
  employmentRelationshipId: string;
  roleTitle?: string;
  startDate?: Date;
  endDate?: Date;
  workPermitRecordId?: string;
  actorIdentityId?: string;
  actorPersona: LabourActorPersona;
  changeReason?: string;
  destructiveOverwrite?: boolean;
}

@Injectable()
export class EmploymentRelationshipService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: LabourBoundaryService,
  ) {}

  async createRelationship(input: CreateEmploymentRelationshipInput) {
    const relationshipNumber = `${EMPLOYMENT_RELATIONSHIP_NUMBER_PREFIX}-${randomUUID().slice(0, 8).toUpperCase()}`;
    return this.prisma.employmentRelationship.create({
      data: {
        id: randomUUID(),
        relationshipNumber,
        employerRegistryRecordId: input.employerRegistryRecordId,
        workerProfileReferenceId: input.workerProfileReferenceId,
        occupationClassificationId: input.occupationClassificationId,
        roleTitle: input.roleTitle,
        startDate: input.startDate,
        isGovernmentWorkAuthorization: false,
      },
    });
  }

  async updateRelationshipPreservingHistory(input: UpdateEmploymentRelationshipInput) {
    const relationship = await this.prisma.employmentRelationship.findUnique({
      where: { id: input.employmentRelationshipId },
      include: { history: true },
    });
    if (!relationship) {
      throw new NotFoundException('Employment relationship not found');
    }

    this.boundary.assertNoDestructiveRelationshipOverwrite(
      relationship.history.length,
      Boolean(input.destructiveOverwrite),
    );

    const nextRole = input.roleTitle ?? relationship.roleTitle;
    const nextStart = input.startDate ?? relationship.startDate;
    const nextEnd = input.endDate ?? relationship.endDate;

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.employmentRelationshipHistory.create({
        data: {
          id: randomUUID(),
          employmentRelationshipId: relationship.id,
          employerRegistryRecordId: relationship.employerRegistryRecordId,
          workerProfileReferenceId: relationship.workerProfileReferenceId,
          roleTitle: relationship.roleTitle,
          startDate: relationship.startDate,
          endDate: relationship.endDate,
          workPermitRecordId: relationship.currentWorkPermitRecordId,
          changeReason: input.changeReason ?? 'SUPERSEDED',
          actorIdentityId: input.actorIdentityId,
          actorPersona: input.actorPersona,
        },
      });

      const updated = await tx.employmentRelationship.update({
        where: { id: relationship.id },
        data: {
          roleTitle: nextRole,
          startDate: nextStart,
          endDate: nextEnd,
          currentWorkPermitRecordId:
            input.workPermitRecordId ?? relationship.currentWorkPermitRecordId,
        },
      });

      const historyCount = await tx.employmentRelationshipHistory.count({
        where: { employmentRelationshipId: relationship.id },
      });

      return { relationship: updated, historyEntries: historyCount, priorSnapshotPreserved: true };
    });
  }
}
