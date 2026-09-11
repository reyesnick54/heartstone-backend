import { Injectable } from '@nestjs/common';
import {
  AuthorityFunctionStatus,
  AuthorityGoverningSourceStatus,
  AuthorityRevalidationState,
  SecurityAuditEventType,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { AuthorityAuditService } from '../audit/authority-audit.service';

export interface CreateAuthorityFunctionInput {
  code: string;
  name: string;
  description?: string;
}

export interface CreateGoverningSourceInput {
  code: string;
  version: string;
  name: string;
  description?: string;
  isControlling?: boolean;
  authenticated?: boolean;
}

export interface CreateAssignmentInput {
  functionId: string;
  governingSourceId: string;
  officeId?: string;
  officeholderId?: string;
}

@Injectable()
export class AuthorityRegistryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuthorityAuditService,
  ) {}

  async createFunction(input: CreateAuthorityFunctionInput) {
    const created = await this.prisma.authorityFunction.create({
      data: {
        code: input.code,
        name: input.name,
        description: input.description,
      },
    });

    await this.audit.record({
      eventType: SecurityAuditEventType.AUTHORITY_RECORD_CREATED,
      metadata: { functionId: created.id, code: created.code },
    });

    return created;
  }

  async activateFunction(functionId: string) {
    const updated = await this.prisma.authorityFunction.update({
      where: { id: functionId },
      data: { status: AuthorityFunctionStatus.ACTIVE },
    });

    await this.audit.record({
      eventType: SecurityAuditEventType.AUTHORITY_FUNCTION_ACTIVATED,
      metadata: { functionId },
    });

    return updated;
  }

  async createGoverningSource(input: CreateGoverningSourceInput) {
    const created = await this.prisma.authorityGoverningSource.create({
      data: {
        code: input.code,
        version: input.version,
        name: input.name,
        description: input.description,
        isControlling: input.isControlling ?? false,
        status: AuthorityGoverningSourceStatus.ACTIVE,
        authenticatedAt: input.authenticated === false ? null : new Date(),
      },
    });

    await this.audit.record({
      eventType: SecurityAuditEventType.AUTHORITY_SOURCE_LINKED,
      metadata: { governingSourceId: created.id, code: created.code, version: created.version },
    });

    return created;
  }

  async amendGoverningSource(governingSourceId: string) {
    return this.prisma.authorityGoverningSource.update({
      where: { id: governingSourceId },
      data: { status: AuthorityGoverningSourceStatus.AMENDED },
    });
  }

  async revokeGoverningSource(governingSourceId: string) {
    return this.prisma.authorityGoverningSource.update({
      where: { id: governingSourceId },
      data: { status: AuthorityGoverningSourceStatus.REVOKED },
    });
  }

  async createAssignment(input: CreateAssignmentInput) {
    const created = await this.prisma.authorityAssignment.create({
      data: {
        functionId: input.functionId,
        governingSourceId: input.governingSourceId,
        officeId: input.officeId,
        officeholderId: input.officeholderId,
        revalidationState: AuthorityRevalidationState.CURRENT,
      },
    });

    await this.audit.record({
      eventType: SecurityAuditEventType.AUTHORITY_ASSIGNMENT_CHANGED,
      metadata: { assignmentId: created.id, functionId: created.functionId },
    });

    return created;
  }
}
