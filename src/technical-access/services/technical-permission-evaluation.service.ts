import { Injectable } from '@nestjs/common';
import { AccountStatus, type TechnicalAccessLevel } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { type SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import { ACCESS_LEVEL_PERMISSIONS } from '../config/access-level-policy.config';
import { PermissionCodes } from '../constants/permission-codes.constants';
import { type RequestPermissionScope } from '../types/permission-scope.types';
import {
  assignmentScopeMatchesRequest,
  type AssignmentScopeSnapshot,
} from '../utils/scope-matches.util';

/** Narrow authenticated self-service permissions (access level B), not administrative grants. */
const AUTHENTICATED_SELF_SERVICE_PERMISSIONS = ACCESS_LEVEL_PERMISSIONS.B;

export interface PermissionEvaluationInput {
  session: SessionContextDto;
  requiredPermissions: readonly string[];
  requireAll?: boolean;
  requestScope?: RequestPermissionScope;
}

export interface PermissionEvaluationResult {
  allowed: boolean;
  reason: string;
  matchedPermission?: string;
  grantedPermissions: readonly string[];
}

@Injectable()
export class TechnicalPermissionEvaluationService {
  constructor(private readonly prisma: PrismaService) {}

  async evaluate(input: PermissionEvaluationInput): Promise<PermissionEvaluationResult> {
    const identityId = input.session.identityId;
    if (!identityId) {
      return {
        allowed: false,
        reason: 'Authenticated identity required',
        grantedPermissions: [],
      };
    }

    if (input.session.userAccountId) {
      const account = await this.prisma.userAccount.findUnique({
        where: { id: input.session.userAccountId },
        select: { status: true },
      });
      if (account && account.status !== AccountStatus.ACTIVE) {
        return {
          allowed: false,
          reason: `Account status ${account.status} cannot exercise technical permissions`,
          grantedPermissions: [],
        };
      }
    }

    const granted = await this.resolveGrantedPermissions(identityId, {
      includeSelfServiceBaseline: true,
    });
    const requestScope = input.requestScope ?? {};

    const scopedAssignments = await this.loadActiveAssignments(identityId);
    const scopePermitted = (permissionCode: string): boolean => {
      if (permissionCode === PermissionCodes.IDENTITY_SELF_READ) {
        return true;
      }

      const relevantAssignments = scopedAssignments.filter((assignment) =>
        assignment.permissionCodes.includes(permissionCode),
      );
      if (relevantAssignments.length === 0) {
        return false;
      }
      return relevantAssignments.some((assignment) =>
        assignmentScopeMatchesRequest(assignment.scope, requestScope),
      );
    };

    const requireAll = input.requireAll ?? true;
    if (requireAll) {
      for (const required of input.requiredPermissions) {
        if (!granted.includes(required)) {
          return {
            allowed: false,
            reason: `Missing technical permission: ${required}`,
            grantedPermissions: granted,
          };
        }
        if (!scopePermitted(required)) {
          return {
            allowed: false,
            reason: `Technical permission ${required} is not valid for the requested institutional scope`,
            grantedPermissions: granted,
          };
        }
      }
      return {
        allowed: true,
        reason: 'All required permissions granted within scope',
        matchedPermission: input.requiredPermissions[0],
        grantedPermissions: granted,
      };
    }

    for (const required of input.requiredPermissions) {
      if (granted.includes(required) && scopePermitted(required)) {
        return {
          allowed: true,
          reason: `Permission ${required} granted within scope`,
          matchedPermission: required,
          grantedPermissions: granted,
        };
      }
    }

    return {
      allowed: false,
      reason: 'No matching permission within scope',
      grantedPermissions: granted,
    };
  }

  async resolveGrantedPermissions(
    identityId: string,
    options?: { includeSelfServiceBaseline?: boolean },
  ): Promise<string[]> {
    const assignments = await this.loadActiveAssignments(identityId);
    const codes = new Set<string>();
    if (options?.includeSelfServiceBaseline) {
      for (const code of AUTHENTICATED_SELF_SERVICE_PERMISSIONS) {
        codes.add(code);
      }
    }
    for (const assignment of assignments) {
      for (const code of assignment.permissionCodes) {
        codes.add(code);
      }
    }
    if (codes.size === 0 && options?.includeSelfServiceBaseline) {
      codes.add(PermissionCodes.IDENTITY_SELF_READ);
    }
    return [...codes].sort();
  }

  private async loadActiveAssignments(identityId: string): Promise<
    {
      scope: AssignmentScopeSnapshot;
      permissionCodes: string[];
    }[]
  > {
    const now = new Date();
    const assignments = await this.prisma.technicalRoleAssignment.findMany({
      where: {
        identityId,
        AND: [
          { OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: now } }] },
          { OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: now } }] },
        ],
      },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    const results: { scope: AssignmentScopeSnapshot; permissionCodes: string[] }[] = [];

    for (const assignment of assignments) {
      const directCodes = assignment.role.permissions.map((rp) => rp.permission.code);
      const levelCodes = assignment.role.accessLevel
        ? await this.permissionsForAccessLevel(assignment.role.accessLevel)
        : [];

      results.push({
        scope: {
          scopeType: assignment.scopeType,
          jurisdictionId: assignment.jurisdictionId,
          institutionId: assignment.institutionId,
          governmentBodyId: assignment.governmentBodyId,
          departmentId: assignment.departmentId,
          officeId: assignment.officeId,
        },
        permissionCodes: [...new Set([...directCodes, ...levelCodes])],
      });
    }

    return results;
  }

  private async permissionsForAccessLevel(level: TechnicalAccessLevel): Promise<string[]> {
    const rows = await this.prisma.technicalAccessLevelPermission.findMany({
      where: { accessLevel: level },
      include: { permission: true },
    });
    return rows.map((row) => row.permission.code);
  }

  /** Technical permissions never confer government authority. */
  assertNotGovernmentAuthority(): void {
    return;
  }
}
