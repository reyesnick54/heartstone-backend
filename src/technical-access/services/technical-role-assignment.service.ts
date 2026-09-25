import { Injectable, NotFoundException } from '@nestjs/common';
import { TechnicalAccessScopeType } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { SecurityAuditService } from '../../identity/audit/security-audit.service';
import { type SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import { CreateTechnicalRoleAssignmentDto } from '../dto/create-technical-role-assignment.dto';
import { TechnicalRoleAssignmentResponseDto } from '../dto/technical-role-assignment-response.dto';

@Injectable()
export class TechnicalRoleAssignmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly securityAudit: SecurityAuditService,
  ) {}

  async assignRole(
    dto: CreateTechnicalRoleAssignmentDto,
    actor: SessionContextDto,
  ): Promise<TechnicalRoleAssignmentResponseDto> {
    const role = await this.prisma.technicalRole.findUnique({
      where: { code: dto.roleCode },
    });
    if (!role) {
      throw new NotFoundException(`Technical role "${dto.roleCode}" was not found`);
    }

    await this.prisma.identity.findUniqueOrThrow({ where: { id: dto.identityId } });

    const assignment = await this.prisma.technicalRoleAssignment.create({
      data: {
        identityId: dto.identityId,
        roleId: role.id,
        scopeType: dto.scopeType ?? TechnicalAccessScopeType.PLATFORM,
        jurisdictionId: dto.jurisdictionId,
        institutionId: dto.institutionId,
        governmentBodyId: dto.governmentBodyId,
        departmentId: dto.departmentId,
        officeId: dto.officeId,
        effectiveFrom: dto.effectiveFrom,
        effectiveUntil: dto.effectiveUntil,
        assignedByIdentityId: actor.identityId,
      },
      include: { role: true },
    });

    await this.securityAudit.record({
      eventType: 'TECHNICAL_ROLE_ASSIGNED',
      identityId: dto.identityId,
      actorIdentityId: actor.identityId,
      sessionId: actor.sessionId,
      userAccountId: actor.userAccountId ?? undefined,
      metadata: {
        roleCode: role.code,
        scopeType: assignment.scopeType,
        institutionId: assignment.institutionId,
      },
    });

    return {
      id: assignment.id,
      identityId: assignment.identityId,
      roleCode: role.code,
      roleName: role.name,
      scopeType: assignment.scopeType,
      jurisdictionId: assignment.jurisdictionId ?? undefined,
      institutionId: assignment.institutionId ?? undefined,
      governmentBodyId: assignment.governmentBodyId ?? undefined,
      departmentId: assignment.departmentId ?? undefined,
      officeId: assignment.officeId ?? undefined,
      effectiveFrom: assignment.effectiveFrom ?? undefined,
      effectiveUntil: assignment.effectiveUntil ?? undefined,
      createdAt: assignment.createdAt,
    };
  }

  async listForIdentity(identityId: string): Promise<TechnicalRoleAssignmentResponseDto[]> {
    const rows = await this.prisma.technicalRoleAssignment.findMany({
      where: { identityId },
      include: { role: true },
      orderBy: { createdAt: 'asc' },
    });

    return rows.map((assignment) => ({
      id: assignment.id,
      identityId: assignment.identityId,
      roleCode: assignment.role.code,
      roleName: assignment.role.name,
      scopeType: assignment.scopeType,
      jurisdictionId: assignment.jurisdictionId ?? undefined,
      institutionId: assignment.institutionId ?? undefined,
      governmentBodyId: assignment.governmentBodyId ?? undefined,
      departmentId: assignment.departmentId ?? undefined,
      officeId: assignment.officeId ?? undefined,
      effectiveFrom: assignment.effectiveFrom ?? undefined,
      effectiveUntil: assignment.effectiveUntil ?? undefined,
      createdAt: assignment.createdAt,
    }));
  }
}
