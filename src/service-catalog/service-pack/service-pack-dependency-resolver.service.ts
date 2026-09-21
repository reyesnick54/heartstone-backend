import { Injectable } from '@nestjs/common';
import {
  FunctionAuthorityLifecycleStatus,
  GoverningSourceStatus,
  IntegrationDefinitionStatus,
  StructuralLifecycleStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import {
  type ResolvedServicePackContext,
  type ServicePackDependencyEntry,
  type ServicePackManifest,
} from './service-pack.types';

@Injectable()
export class ServicePackDependencyResolver {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(manifest: ServicePackManifest): Promise<{
    context: ResolvedServicePackContext;
    dependencies: ServicePackDependencyEntry[];
  }> {
    const dependencies: ServicePackDependencyEntry[] = [];
    const context: ResolvedServicePackContext = {
      departmentIds: new Map(),
      functionAuthorityIds: new Map(),
      governingSourceIds: new Map(),
      existingServiceSlugs: new Set(),
      existingServiceCodes: new Set(),
      integrationIds: new Map(),
      dashboardIds: new Map(),
      externalAuthorityIds: new Map(),
      formDefinitionIds: new Map(),
      workflowDefinitionIds: new Map(),
      serviceFamilyIds: new Map(),
    };

    const jurisdiction = await this.prisma.jurisdiction.findUnique({
      where: { code: manifest.jurisdictionCode },
      select: { id: true },
    });
    context.jurisdictionId = jurisdiction?.id;
    dependencies.push({
      ref: manifest.jurisdictionCode,
      kind: 'Jurisdiction',
      resolved: Boolean(jurisdiction),
      entityId: jurisdiction?.id,
    });

    const institution = await this.prisma.institution.findFirst({
      where: { code: manifest.institutionCode, jurisdictionId: jurisdiction?.id },
      select: { id: true, status: true },
    });
    context.institutionId = institution?.id;
    dependencies.push({
      ref: manifest.institutionCode,
      kind: 'Institution',
      resolved: institution?.status === StructuralLifecycleStatus.ACTIVE,
      entityId: institution?.id,
    });

    const institutionId = institution?.id;
    if (institutionId) {
      await this.resolveInstitutionScopedDependencies(
        manifest,
        institutionId,
        context,
        dependencies,
      );
    }

    return { context, dependencies };
  }

  private async resolveInstitutionScopedDependencies(
    manifest: ServicePackManifest,
    institutionId: string,
    context: ResolvedServicePackContext,
    dependencies: ServicePackDependencyEntry[],
  ): Promise<void> {
    const departmentCodes = new Set(manifest.services.map((service) => service.departmentCode));
    for (const code of departmentCodes) {
      const department = await this.prisma.department.findFirst({
        where: { code, institutionId },
        select: { id: true, status: true },
      });
      const resolved =
        Boolean(department) && department?.status === StructuralLifecycleStatus.ACTIVE;
      if (department && resolved) {
        context.departmentIds.set(code, department.id);
      }
      dependencies.push({
        ref: code,
        kind: 'Department',
        resolved,
        entityId: department?.id,
      });
    }

    const familyCodes = new Set(manifest.services.map((service) => service.serviceFamilyCode));
    for (const code of familyCodes) {
      const family = await this.prisma.serviceFamily.findUnique({
        where: { code },
        select: { id: true },
      });
      if (family) {
        context.serviceFamilyIds.set(code, family.id);
      }
      dependencies.push({
        ref: code,
        kind: 'ServiceFamily',
        resolved: Boolean(family),
        entityId: family?.id,
      });
    }

    const functionCodes = new Set(
      manifest.services.flatMap((service) => service.functionAuthorityCodes),
    );
    for (const workflow of manifest.workflows ?? []) {
      for (const step of workflow.steps) {
        if (step.functionAuthorityCode) {
          functionCodes.add(step.functionAuthorityCode);
        }
      }
    }
    for (const code of functionCodes) {
      const record = await this.prisma.functionAuthorityRecord.findUnique({
        where: { code },
        select: { id: true, lifecycleStatus: true, institutionId: true },
      });
      const resolved =
        record !== null &&
        record.lifecycleStatus === FunctionAuthorityLifecycleStatus.ACTIVE &&
        (record.institutionId === institutionId || record.institutionId === null);
      if (record && resolved) {
        context.functionAuthorityIds.set(code, record.id);
      }
      dependencies.push({
        ref: code,
        kind: 'FunctionAuthorityRecord',
        resolved,
        entityId: record?.id,
      });
    }

    const governingSourceCodes = new Set(
      manifest.services.flatMap((service) => service.governingSourceCodes),
    );
    for (const code of governingSourceCodes) {
      const source = await this.prisma.governingSource.findUnique({
        where: { code },
        select: { id: true, status: true, authenticatedAt: true },
      });
      const resolved =
        source !== null &&
        source.status === GoverningSourceStatus.AUTHENTICATED &&
        source.authenticatedAt !== null;
      if (source && resolved) {
        context.governingSourceIds.set(code, source.id);
      }
      dependencies.push({
        ref: code,
        kind: 'GoverningSource',
        resolved,
        entityId: source?.id,
      });
    }

    const integrationCodes = new Set(
      manifest.services.flatMap((service) => service.integrationCodes ?? []),
    );
    for (const code of integrationCodes) {
      const integration = await this.prisma.integrationDefinition.findFirst({
        where: { code, institutionId },
        select: { id: true, status: true },
      });
      const resolved =
        Boolean(integration) &&
        (integration?.status === IntegrationDefinitionStatus.ACTIVE ||
          integration?.status === IntegrationDefinitionStatus.ACCEPTED);
      if (integration && resolved) {
        context.integrationIds.set(code, integration.id);
      }
      dependencies.push({
        ref: code,
        kind: 'IntegrationDefinition',
        resolved,
        entityId: integration?.id,
      });
    }

    const dashboardCodes = new Set(
      manifest.services.flatMap((service) => service.dashboardCodes ?? []),
    );
    for (const code of dashboardCodes) {
      const dashboard = await this.prisma.dashboardDefinition.findFirst({
        where: { code, institutionId },
        select: { id: true },
      });
      if (dashboard) {
        context.dashboardIds.set(code, dashboard.id);
      }
      dependencies.push({
        ref: code,
        kind: 'DashboardDefinition',
        resolved: Boolean(dashboard),
        entityId: dashboard?.id,
      });
    }

    const externalAuthorityCodes = new Set(
      manifest.services.flatMap((service) => service.externalAuthorityCodes ?? []),
    );
    for (const code of externalAuthorityCodes) {
      const externalAuthority = await this.prisma.externalAuthority.findUnique({
        where: { code },
        select: { id: true },
      });
      if (externalAuthority) {
        context.externalAuthorityIds.set(code, externalAuthority.id);
      }
      dependencies.push({
        ref: code,
        kind: 'ExternalAuthority',
        resolved: Boolean(externalAuthority),
        entityId: externalAuthority?.id,
      });
    }

    const formCodes = new Set<string>();
    for (const service of manifest.services) {
      if (service.formCode) {
        formCodes.add(service.formCode);
      }
    }
    for (const form of manifest.forms ?? []) {
      formCodes.add(form.code);
    }
    for (const code of formCodes) {
      const formDefinition = await this.prisma.formDefinition.findUnique({
        where: { code },
        select: { id: true },
      });
      if (formDefinition) {
        context.formDefinitionIds.set(code, formDefinition.id);
      }
      dependencies.push({
        ref: code,
        kind: 'FormDefinition',
        resolved: Boolean(formDefinition),
        entityId: formDefinition?.id,
      });
    }

    const workflowCodes = new Set<string>();
    for (const service of manifest.services) {
      if (service.workflowCode) {
        workflowCodes.add(service.workflowCode);
      }
    }
    for (const workflow of manifest.workflows ?? []) {
      workflowCodes.add(workflow.code);
    }
    for (const code of workflowCodes) {
      const workflowDefinition = await this.prisma.workflowDefinition.findUnique({
        where: { code },
        select: { id: true },
      });
      if (workflowDefinition) {
        context.workflowDefinitionIds.set(code, workflowDefinition.id);
      }
      dependencies.push({
        ref: code,
        kind: 'WorkflowDefinition',
        resolved: Boolean(workflowDefinition),
        entityId: workflowDefinition?.id,
      });
    }

    const existingServices = await this.prisma.governmentService.findMany({
      where: { responsibleInstitutionId: institutionId },
      select: { code: true, slug: true },
    });
    for (const service of existingServices) {
      context.existingServiceCodes.add(service.code);
      context.existingServiceSlugs.add(service.slug);
    }
  }
}
