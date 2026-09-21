import { Injectable } from '@nestjs/common';
import {
  ActivationConditionStatus,
  CredentialStatus,
  FormDefinitionStatus,
  IdentityType,
  IntegrationDefinitionStatus,
  IntegrationOutageStatus,
  LegalHoldStatus,
  ProductionReadinessStatus,
  SecurityAuditEventType,
  WorkflowDefinitionStatus,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import {
  PlatformAdminListItemDto,
  PlatformAdminListResponseDto,
} from '../dto/platform-admin-response.dto';
import { PLATFORM_ADMIN_AUTHORITY_DISCLAIMER, PLATFORM_ADMIN_CONFIGURATION_DISCLAIMER } from '../platform-admin.constants';
import { type ResolvedPlatformAdminContext } from '../types/platform-admin-context.types';

@Injectable()
export class PlatformAdminProjectionService {
  constructor(private readonly prisma: PrismaService) {}

  async listInstitutions(
    context: ResolvedPlatformAdminContext,
  ): Promise<PlatformAdminListResponseDto> {
    const where =
      context.policy.institutionIds.length > 0
        ? { id: { in: context.policy.institutionIds } }
        : {};

    const records = await this.prisma.institution.findMany({
      where,
      orderBy: [{ name: 'asc' }],
      select: { id: true, code: true, name: true, type: true },
    });

    return this.toListResponse(
      records.map((record) => ({
        id: record.id,
        code: record.code,
        name: record.name,
        status: record.type,
      })),
    );
  }

  async listDepartments(context: ResolvedPlatformAdminContext): Promise<PlatformAdminListResponseDto> {
    const where = this.buildDepartmentScope(context);

    const records = await this.prisma.department.findMany({
      where,
      include: { institution: { select: { name: true } } },
      orderBy: [{ name: 'asc' }],
    });

    return this.toListResponse(
      records.map((record) => ({
        id: record.id,
        code: record.code,
        name: record.name,
        status: record.status,
        institutionName: record.institution.name,
      })),
    );
  }

  async listOffices(context: ResolvedPlatformAdminContext): Promise<PlatformAdminListResponseDto> {
    const departmentScope = this.buildDepartmentScope(context);

    const records = await this.prisma.office.findMany({
      where: {
        department: departmentScope,
      },
      include: {
        department: { select: { name: true, institution: { select: { name: true } } } },
      },
      orderBy: [{ name: 'asc' }],
    });

    return this.toListResponse(
      records.map((record) => ({
        id: record.id,
        code: record.code,
        name: record.name,
        status: record.status,
        departmentName: record.department.name,
        institutionName: record.department.institution.name,
      })),
    );
  }

  async listOfficeholders(): Promise<PlatformAdminListResponseDto> {
    const records = await this.prisma.officeholder.findMany({
      orderBy: [{ name: 'asc' }],
      select: { id: true, code: true, name: true },
    });

    return this.toListResponse(
      records.map((record) => ({
        id: record.id,
        code: record.code,
        name: record.name,
      })),
    );
  }

  async listServices(context: ResolvedPlatformAdminContext): Promise<PlatformAdminListResponseDto> {
    const institutionScope =
      context.policy.institutionIds.length > 0
        ? { in: context.policy.institutionIds }
        : undefined;

    const records = await this.prisma.governmentService.findMany({
      where: {
        responsibleInstitutionId: institutionScope,
        responsibleDepartmentId:
          context.policy.departmentIds.length > 0
            ? { in: context.policy.departmentIds }
            : undefined,
      },
      include: {
        responsibleInstitution: { select: { name: true } },
        responsibleDepartment: { select: { name: true } },
        versions: { select: { maturityStatus: true }, take: 1, orderBy: { createdAt: 'desc' } },
      },
      orderBy: [{ publicName: 'asc' }],
    });

    return this.toListResponse(
      records.map((record) => ({
        id: record.id,
        code: record.code,
        name: record.publicName,
        status: record.versions[0]?.maturityStatus ?? 'UNKNOWN',
        institutionName: record.responsibleInstitution.name,
        departmentName: record.responsibleDepartment.name,
      })),
    );
  }

  async listForms(): Promise<PlatformAdminListResponseDto> {
    const records = await this.prisma.formDefinition.findMany({
      orderBy: [{ name: 'asc' }],
      include: {
        governmentServiceVersion: {
          include: {
            governmentService: { select: { publicName: true } },
          },
        },
      },
    });

    return this.toListResponse(
      records.map((record) => ({
        id: record.id,
        code: record.code,
        name: record.name,
        status: record.status,
        attentionSignal:
          record.status === FormDefinitionStatus.DRAFT ? 'requires-activation' : undefined,
        institutionName: record.governmentServiceVersion.governmentService.publicName,
      })),
    );
  }

  async listWorkflows(): Promise<PlatformAdminListResponseDto> {
    const records = await this.prisma.workflowDefinition.findMany({
      orderBy: [{ name: 'asc' }],
      include: { governmentService: { select: { publicName: true } } },
    });

    return this.toListResponse(
      records.map((record) => ({
        id: record.id,
        code: record.code,
        name: record.name,
        status: record.status,
        attentionSignal:
          record.status === WorkflowDefinitionStatus.DRAFT ? 'requires-validation' : undefined,
        institutionName: record.governmentService?.publicName,
      })),
    );
  }

  async listIntegrations(
    context: ResolvedPlatformAdminContext,
  ): Promise<PlatformAdminListResponseDto> {
    const records = await this.prisma.integrationDefinition.findMany({
      where:
        context.policy.institutionIds.length > 0
          ? { institutionId: { in: context.policy.institutionIds } }
          : {},
      include: {
        institution: { select: { name: true } },
        outages: {
          where: {
            status: {
              in: [IntegrationOutageStatus.DETECTED, IntegrationOutageStatus.CONFIRMED],
            },
          },
          take: 1,
        },
      },
      orderBy: [{ name: 'asc' }],
    });

    return this.toListResponse(
      records.map((record) => ({
        id: record.id,
        code: record.code,
        name: record.name,
        status: record.status,
        institutionName: record.institution.name,
        attentionSignal:
          record.outages.length > 0
            ? 'degraded'
            : record.status === IntegrationDefinitionStatus.SUSPENDED
              ? 'offline'
              : undefined,
      })),
    );
  }

  async listCommunications(
    context: ResolvedPlatformAdminContext,
  ): Promise<PlatformAdminListResponseDto> {
    const records = await this.prisma.communicationTemplate.findMany({
      where:
        context.policy.institutionIds.length > 0
          ? { institutionId: { in: context.policy.institutionIds } }
          : {},
      include: { institution: { select: { name: true } } },
      orderBy: [{ name: 'asc' }],
    });

    return this.toListResponse(
      records.map((record) => ({
        id: record.id,
        code: record.code,
        name: record.name,
        status: record.status,
        institutionName: record.institution?.name,
      })),
    );
  }

  async listAiAgents(): Promise<PlatformAdminListResponseDto> {
    const records = await this.prisma.identity.findMany({
      where: { type: IdentityType.SERVICE },
      include: { credentials: true, authenticationMethods: true },
      orderBy: [{ displayName: 'asc' }],
    });

    return this.toListResponse(
      records.map((record) => {
        const methodsDisabled =
          record.authenticationMethods.length > 0 &&
          record.authenticationMethods.every((method) => !method.isEnabled);
        const credentialsRevoked =
          record.credentials.length > 0 &&
          record.credentials.every((credential) => credential.status === CredentialStatus.REVOKED);
        const suspended = methodsDisabled || credentialsRevoked;

        return {
          id: record.id,
          code: record.displayName,
          name: record.displayName,
          status: suspended ? 'SUSPENDED' : 'ACTIVE',
          attentionSignal: suspended ? 'suspended' : undefined,
        };
      }),
    );
  }

  async listSecurity(context: ResolvedPlatformAdminContext): Promise<PlatformAdminListResponseDto> {
    if (!context.policy.canViewSecurity) {
      return this.toListResponse([]);
    }

    const [legalHolds, auditEvents] = await Promise.all([
      this.prisma.legalHold.findMany({
        where: { status: LegalHoldStatus.ACTIVE },
        orderBy: [{ createdAt: 'desc' }],
        take: 50,
      }),
      this.prisma.securityAuditEvent.findMany({
        where: {
          eventType: {
            in: [
              SecurityAuditEventType.PLATFORM_ADMIN_ACCESS_DENIED,
              SecurityAuditEventType.SCOPE_ACCESS_DENIED,
            ],
          },
        },
        orderBy: [{ createdAt: 'desc' }],
        take: 50,
      }),
    ]);

    const items: PlatformAdminListItemDto[] = [
      ...legalHolds.map((hold) => ({
        id: hold.id,
        code: hold.holdNumber,
        name: hold.title,
        status: hold.status,
        attentionSignal: 'legal-hold-active',
      })),
      ...auditEvents.map((event) => ({
        id: event.id,
        code: event.eventType,
        name: event.eventType,
        status: 'AUDIT',
        attentionSignal: 'security-event',
      })),
    ];

    return this.toListResponse(items);
  }

  async listReadiness(context: ResolvedPlatformAdminContext): Promise<PlatformAdminListResponseDto> {
    if (!context.policy.canViewReadiness) {
      return this.toListResponse([]);
    }

    const [assessments, activationConditions] = await Promise.all([
      this.prisma.productionReadinessAssessment.findMany({
        include: { capabilityDefinition: { select: { code: true, name: true } } },
        orderBy: [{ updatedAt: 'desc' }],
        take: 50,
      }),
      this.prisma.activationCondition.findMany({
        where: {
          status: { in: [ActivationConditionStatus.PENDING, ActivationConditionStatus.UNSATISFIED] },
        },
        orderBy: [{ createdAt: 'desc' }],
        take: 50,
      }),
    ]);

    const items: PlatformAdminListItemDto[] = [
      ...assessments.map((assessment) => ({
        id: assessment.id,
        code: assessment.capabilityDefinition.code,
        name: assessment.capabilityDefinition.name,
        status: assessment.overallStatus,
        attentionSignal:
          assessment.overallStatus === ProductionReadinessStatus.NOT_READY ||
          assessment.overallStatus === ProductionReadinessStatus.SAFE_HALTED
            ? 'readiness-blocked'
            : undefined,
      })),
      ...activationConditions.map((condition) => ({
        id: condition.id,
        code: condition.id,
        name: condition.conditionText.slice(0, 80),
        status: condition.status,
        attentionSignal: 'activation-condition-pending',
      })),
    ];

    return this.toListResponse(items);
  }

  private buildDepartmentScope(context: ResolvedPlatformAdminContext) {
    if (context.policy.departmentIds.length > 0) {
      return { id: { in: context.policy.departmentIds } };
    }

    if (context.policy.institutionIds.length > 0) {
      return { institutionId: { in: context.policy.institutionIds } };
    }

    return {};
  }

  private toListResponse(items: PlatformAdminListItemDto[]): PlatformAdminListResponseDto {
    return {
      items,
      totalCount: items.length,
      hasSubstantiveGovernmentAuthority: false,
      authorityDisclaimer: PLATFORM_ADMIN_AUTHORITY_DISCLAIMER,
      configurationDisclaimer: PLATFORM_ADMIN_CONFIGURATION_DISCLAIMER,
    };
  }
}
