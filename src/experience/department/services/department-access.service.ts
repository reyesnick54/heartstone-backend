import { Injectable, NotFoundException } from '@nestjs/common';
import { DashboardAccessPurpose, IdentityType } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { type ActorContext } from '../../../identity/auth/context/actor-context.types';
import {
  DEPARTMENT_AGGREGATE_DISCLAIMER,
  DEPARTMENT_AUTHORITY_DISCLAIMER,
} from '../department-experience.constants';
import { DepartmentAccessDeniedException } from '../exceptions/department-access-denied.exception';
import {
  type DepartmentRelationshipContext,
  type ResolvedDepartmentManagementContext,
} from '../types/department-context.types';

@Injectable()
export class DepartmentAccessService {
  constructor(private readonly prisma: PrismaService) {}

  assertActorEligible(actor: ActorContext): void {
    if (actor.identityType === IdentityType.SERVICE) {
      throw new DepartmentAccessDeniedException(
        'Service identities cannot access department management',
      );
    }

    if (!actor.hasInstitutionalRelationships) {
      throw new DepartmentAccessDeniedException('Institutional relationship required');
    }
  }

  hasDepartmentRelationship(actor: ActorContext, departmentId: string): boolean {
    return actor.activeAppointments.some(
      (appointment) => appointment.departmentId === departmentId,
    );
  }

  async hasManagementPolicy(actor: ActorContext, departmentId: string): Promise<boolean> {
    const now = new Date();
    const policy = await this.prisma.dashboardAccessPolicy.findFirst({
      where: {
        identityId: actor.identityId,
        departmentId,
        purpose: DashboardAccessPurpose.DEPARTMENT_MANAGEMENT,
        substantiveAccessRequired: true,
        technicalPermissionCode: null,
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: now } }],
      },
    });

    return policy !== null;
  }

  buildRelationshipContexts(actor: ActorContext): DepartmentRelationshipContext[] {
    const byDepartment = new Map<string, DepartmentRelationshipContext>();

    for (const appointment of actor.activeAppointments) {
      const existing = byDepartment.get(appointment.departmentId);
      if (existing) {
        existing.appointmentIds.push(appointment.appointmentId);
        if (!existing.officeIds.includes(appointment.officeId)) {
          existing.officeIds.push(appointment.officeId);
        }
        continue;
      }

      byDepartment.set(appointment.departmentId, {
        departmentId: appointment.departmentId,
        departmentName: '',
        departmentCode: '',
        institutionId: appointment.institutionId,
        institutionName: '',
        appointmentIds: [appointment.appointmentId],
        officeIds: [appointment.officeId],
      });
    }

    return [...byDepartment.values()];
  }

  async resolveManagementContext(
    actor: ActorContext,
    departmentId: string,
  ): Promise<ResolvedDepartmentManagementContext> {
    this.assertActorEligible(actor);

    const department = await this.prisma.department.findUnique({
      where: { id: departmentId },
      include: { institution: true },
    });

    if (!department) {
      throw new NotFoundException(`Department "${departmentId}" was not found`);
    }

    const hasRelationship = this.hasDepartmentRelationship(actor, departmentId);
    const hasPolicy = await this.hasManagementPolicy(actor, departmentId);

    if (!hasPolicy) {
      throw new DepartmentAccessDeniedException(
        'Configured department management policy required; department membership alone does not grant management rights',
      );
    }

    if (!hasRelationship) {
      throw new DepartmentAccessDeniedException(
        'No legitimate institutional relationship to the requested department',
      );
    }

    return {
      identityId: actor.identityId,
      departmentId: department.id,
      departmentName: department.name,
      departmentCode: department.code,
      institutionId: department.institutionId,
      institutionName: department.institution.name,
      hasManagementPolicy: true,
      hasDepartmentRelationship: true,
      authorityDisclaimer: DEPARTMENT_AUTHORITY_DISCLAIMER,
      aggregateDisclaimer: DEPARTMENT_AGGREGATE_DISCLAIMER,
    };
  }

  async listAccessibleDepartments(actor: ActorContext): Promise<
    {
      departmentId: string;
      departmentName: string;
      departmentCode: string;
      institutionId: string;
      hasManagementAccess: boolean;
      hasDepartmentRelationship: boolean;
    }[]
  > {
    this.assertActorEligible(actor);

    const relationships = this.buildRelationshipContexts(actor);
    if (relationships.length === 0) {
      return [];
    }

    const departmentIds = relationships.map((relationship) => relationship.departmentId);
    const departments = await this.prisma.department.findMany({
      where: { id: { in: departmentIds } },
      select: { id: true, name: true, code: true, institutionId: true },
    });

    const departmentById = new Map(departments.map((department) => [department.id, department]));

    const results = await Promise.all(
      relationships.map(async (relationship) => {
        const department = departmentById.get(relationship.departmentId);
        const hasManagementAccess = await this.hasManagementPolicy(
          actor,
          relationship.departmentId,
        );

        return {
          departmentId: relationship.departmentId,
          departmentName: department?.name ?? relationship.departmentName,
          departmentCode: department?.code ?? relationship.departmentCode,
          institutionId: department?.institutionId ?? relationship.institutionId,
          hasManagementAccess,
          hasDepartmentRelationship: true,
        };
      }),
    );

    return results;
  }
}
