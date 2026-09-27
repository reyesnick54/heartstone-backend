import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ApplicantCategory,
  AuthorityActionType,
  FormDataClassification,
  FormDefinitionStatus,
  FormFieldType,
  FormVersionStatus,
  GovernmentServiceMaturityStatus,
  GovernmentServicePublicAvailability,
  Prisma,
  ServiceFunctionMappingStatus,
  ServicePackDeploymentBindingDomain,
  ServicePackManifestValidationStatus,
  ServicePackVersionStatus,
  WorkflowDefinitionStatus,
  WorkflowStepConsequenceLevel,
  WorkflowStepType,
  WorkflowTransitionJoinType,
  WorkflowVersionStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ServicePacksBoundaryService } from '../../service-packs/common/service-packs-boundary.service';
import { calculateServicePackFingerprint } from './calculate-service-pack-fingerprint';
import { type ServicePackManifest, type ServicePackServiceDefinition } from './service-pack.types';
import { buildServicePackConfigurationFingerprintFromManifest } from './service-pack-configuration-fingerprint.util';
import { SERVICE_PACK_RUNTIME_COMPILER_REASON_CODES } from './service-pack-runtime-compiler.constants';
import {
  type MaterializedServiceArtifacts,
  type ResolvedCompileScope,
  type ServicePackRuntimeCompileRequest,
  type ServicePackRuntimeCompileResult,
} from './service-pack-runtime-compiler.types';
import {
  extractAuthoringManifest,
  resolveCompileScope,
  validateAuthoringManifestForCompilation,
} from './service-pack-runtime-compiler.validation';

function mapApplicantCategory(value: string): ApplicantCategory {
  if ((Object.values(ApplicantCategory) as string[]).includes(value)) {
    return value as ApplicantCategory;
  }
  return ApplicantCategory.INDIVIDUAL;
}

function mapFormFieldType(value: string): FormFieldType {
  if ((Object.values(FormFieldType) as string[]).includes(value)) {
    return value as FormFieldType;
  }
  return FormFieldType.TEXT;
}

function mapWorkflowStepType(value: string): WorkflowStepType {
  if ((Object.values(WorkflowStepType) as string[]).includes(value)) {
    return value as WorkflowStepType;
  }
  return WorkflowStepType.INTERNAL_COORDINATION;
}

function mapConsequenceLevel(value: string): WorkflowStepConsequenceLevel {
  if ((Object.values(WorkflowStepConsequenceLevel) as string[]).includes(value)) {
    return value as WorkflowStepConsequenceLevel;
  }
  return WorkflowStepConsequenceLevel.ADMINISTRATIVE;
}

@Injectable()
export class ServicePackRuntimeCompilerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ServicePacksBoundaryService,
  ) {}

  async compileVersion(
    request: ServicePackRuntimeCompileRequest,
  ): Promise<ServicePackRuntimeCompileResult> {
    const version = await this.prisma.servicePackVersion.findUnique({
      where: { id: request.servicePackVersionId },
      include: { servicePack: true },
    });

    if (!version) {
      throw new NotFoundException(SERVICE_PACK_RUNTIME_COMPILER_REASON_CODES.VERSION_NOT_FOUND);
    }

    this.boundary.assertAcceptedVersionImmutable(version.immutable, version.status);

    const authoringManifest = extractAuthoringManifest(version.manifest);
    if (!authoringManifest) {
      throw new BadRequestException(
        SERVICE_PACK_RUNTIME_COMPILER_REASON_CODES.AUTHORING_MANIFEST_MISSING,
      );
    }

    const existingDeploymentManifest = this.readDeploymentEntries(version.manifest);
    if (existingDeploymentManifest.length > 0 && !request.forceRecompile) {
      throw new BadRequestException(SERVICE_PACK_RUNTIME_COMPILER_REASON_CODES.ALREADY_COMPILED);
    }

    if (version.status === ServicePackVersionStatus.ACCEPTED && request.forceRecompile) {
      throw new BadRequestException(SERVICE_PACK_RUNTIME_COMPILER_REASON_CODES.VERSION_IMMUTABLE);
    }

    const validation = await validateAuthoringManifestForCompilation(
      this.prisma,
      authoringManifest,
    );
    if (validation.issues.length > 0) {
      throw new BadRequestException({
        code: SERVICE_PACK_RUNTIME_COMPILER_REASON_CODES.VALIDATION_FAILED,
        issues: validation.issues,
      });
    }

    const scope = await resolveCompileScope(this.prisma, authoringManifest);
    const compilationFingerprint = calculateServicePackFingerprint(authoringManifest);

    const compiled = await this.prisma.$transaction(async (tx) => {
      const materialized: MaterializedServiceArtifacts[] = [];

      for (const serviceDefinition of authoringManifest.services) {
        materialized.push(
          await this.materializeService(tx, scope, authoringManifest, serviceDefinition),
        );
      }

      const entries = materialized.flatMap((item) => item.entries);
      const deploymentManifest = {
        authoringManifest,
        servicePackVersionId: version.id,
        servicePackVersionLabel: version.version,
        compilationFingerprint,
        entries,
      };

      const configurationFingerprint =
        buildServicePackConfigurationFingerprintFromManifest(deploymentManifest);

      await tx.servicePackVersion.update({
        where: { id: version.id },
        data: {
          manifest: deploymentManifest as unknown as Prisma.InputJsonValue,
          compilationFingerprint,
          manifestChecksum: compilationFingerprint,
          manifestValidationStatus: ServicePackManifestValidationStatus.VALIDATED,
          status: ServicePackVersionStatus.COMPILED,
          compiledAt: new Date(),
        },
      });

      return {
        entries,
        configurationFingerprint,
        materialized,
      };
    });

    const artifacts = compiled.materialized.reduce(
      (acc, item) => {
        acc.governmentServiceVersionIds.push(item.serviceVersionId);
        acc.formDefinitionIds.push(item.formDefinitionId);
        acc.workflowDefinitionIds.push(item.workflowDefinitionId);
        acc.feeDefinitionIds.push(...item.feeDefinitionIds);
        acc.checklistItemIds.push(...item.checklistItemIds);
        acc.outputDefinitionIds.push(...item.outputDefinitionIds);
        acc.redressRouteIds.push(...item.redressRouteIds);
        return acc;
      },
      {
        governmentServiceVersionIds: [] as string[],
        formDefinitionIds: [] as string[],
        workflowDefinitionIds: [] as string[],
        feeDefinitionIds: [] as string[],
        checklistItemIds: [] as string[],
        outputDefinitionIds: [] as string[],
        redressRouteIds: [] as string[],
      },
    );

    return {
      servicePackVersionId: version.id,
      compilationFingerprint,
      configurationFingerprint: compiled.configurationFingerprint,
      entryCount: compiled.entries.length,
      entries: compiled.entries,
      artifacts,
      authoringManifest,
      message:
        'Service pack compiled into DRAFT runtime configuration without operational activation',
    };
  }

  private readDeploymentEntries(manifestValue: unknown): unknown[] {
    if (!manifestValue || typeof manifestValue !== 'object') {
      return [];
    }
    const entries = (manifestValue as { entries?: unknown }).entries;
    return Array.isArray(entries) ? entries : [];
  }

  private async materializeService(
    tx: Prisma.TransactionClient,
    scope: ResolvedCompileScope,
    pack: ServicePackManifest,
    service: ServicePackServiceDefinition,
  ): Promise<MaterializedServiceArtifacts> {
    const serviceFamily = await tx.serviceFamily.findFirstOrThrow({
      where: { code: service.serviceFamilyCode },
    });

    const serviceCode = `${pack.packId}-${service.serviceCode}`.toUpperCase();
    const serviceSlug = `${pack.packId}-${service.serviceSlug}`.toLowerCase();

    const governmentService =
      (await tx.governmentService.findUnique({ where: { code: serviceCode } })) ??
      (await tx.governmentService.create({
        data: {
          code: serviceCode,
          slug: serviceSlug,
          officialName: service.serviceName,
          publicName: service.serviceName,
          summary: service.description,
          responsibleInstitutionId: scope.institutionId,
          responsibleDepartmentId: scope.departmentId,
          serviceFamilyId: serviceFamily.id,
        },
      }));

    const serviceVersion = await tx.governmentServiceVersion.create({
      data: {
        governmentServiceId: governmentService.id,
        version: pack.packVersion,
        purpose: service.description,
        publicDescription: service.description,
        maturityStatus: GovernmentServiceMaturityStatus.DRAFT,
        publicAvailability: GovernmentServicePublicAvailability.HIDDEN,
        institutionallyAccepted: false,
        majorDependencies: service.dependencies.map((dependency) => ({
          code: dependency.dependencyCode,
          dependencyType: dependency.dependencyType,
          resolved: false,
        })),
        applicantCategories: {
          create: service.applicantCategories.map((category) => ({
            category: mapApplicantCategory(category),
          })),
        },
      },
    });

    const primaryForm = service.forms[0];
    if (!primaryForm) {
      throw new BadRequestException('Each service must declare at least one form');
    }

    const formDefinition = await tx.formDefinition.create({
      data: {
        code: `${serviceCode}-${primaryForm.formCode}`,
        name: primaryForm.formName,
        purpose: service.description,
        governmentServiceVersionId: serviceVersion.id,
        status: FormDefinitionStatus.DRAFT,
      },
    });

    const formVersion = await tx.formVersion.create({
      data: {
        formDefinitionId: formDefinition.id,
        version: 1,
        title: { en: primaryForm.formName },
        status: FormVersionStatus.DRAFT,
        sections: {
          create: primaryForm.sections.map((section, sectionIndex) => ({
            sectionKey: section.sectionKey,
            title: { en: section.label },
            displayOrder: sectionIndex + 1,
            fields: {
              create: section.fields.map((field, fieldIndex) => ({
                fieldKey: field.fieldKey,
                label: { en: field.label },
                fieldType: mapFormFieldType(field.fieldType),
                required: field.required,
                displayOrder: fieldIndex + 1,
                dataClassification: field.dataClassification
                  ? (field.dataClassification as FormDataClassification)
                  : undefined,
              })),
            },
          })),
        },
      },
    });

    await tx.governmentServiceVersion.update({
      where: { id: serviceVersion.id },
      data: {
        formDefinitionId: formDefinition.id,
        formVersionId: formVersion.id,
      },
    });

    const checklistItemIds: string[] = [];
    for (const [index, evidence] of service.evidenceRequirements.entries()) {
      const item = await tx.governmentServiceChecklistItem.create({
        data: {
          governmentServiceVersionId: serviceVersion.id,
          itemCode: evidence.evidenceCode,
          label: evidence.label,
          description: evidence.description,
          isRequired: evidence.required,
          sortOrder: index,
        },
      });
      checklistItemIds.push(item.id);
    }

    const feeDefinitionIds: string[] = [];
    for (const [index, fee] of service.fees.entries()) {
      const feeRecord = await tx.governmentServiceFeeDefinition.create({
        data: {
          governmentServiceVersionId: serviceVersion.id,
          code: fee.feeCode,
          label: fee.label,
          amountCents: Math.round(fee.amount * 100),
          currency: fee.currencyCode,
          isVariable: false,
          sortOrder: index,
        },
      });
      feeDefinitionIds.push(feeRecord.id);
    }

    const outputDefinitionIds: string[] = [];
    for (const [index, output] of service.outputs.entries()) {
      const outputRecord = await tx.governmentServiceOutputDefinition.create({
        data: {
          governmentServiceVersionId: serviceVersion.id,
          outputCode: output.outputCode,
          label: output.label,
          sortOrder: index,
        },
      });
      outputDefinitionIds.push(outputRecord.id);
    }

    const redressRouteIds: string[] = [];
    for (const [index, route] of service.redress.entries()) {
      const redressRecord = await tx.governmentServiceRedressRoute.create({
        data: {
          governmentServiceVersionId: serviceVersion.id,
          routeCode: route.routeCode,
          label: route.label,
          description: route.description,
          sortOrder: index,
        },
      });
      redressRouteIds.push(redressRecord.id);
    }

    for (const authorityFunction of service.authorityFunctions) {
      const far = await tx.functionAuthorityRecord.findUniqueOrThrow({
        where: { code: authorityFunction.functionCode },
      });
      await tx.serviceFunctionMapping.create({
        data: {
          governmentServiceVersionId: serviceVersion.id,
          functionAuthorityRecordId: far.id,
          sequenceOrder: authorityFunction.sequenceOrder,
          isConsequential: authorityFunction.isConsequential,
          publicStageLabel: authorityFunction.publicStageLabel,
          status: ServiceFunctionMappingStatus.ACTIVE,
        },
      });
    }

    const workflowDefinition = await tx.workflowDefinition.create({
      data: {
        code: `${serviceCode}-WF`,
        name: `${service.serviceName} Workflow`,
        governmentServiceId: governmentService.id,
        status: WorkflowDefinitionStatus.DRAFT,
      },
    });

    const workflowVersion = await tx.workflowVersion.create({
      data: {
        workflowDefinitionId: workflowDefinition.id,
        version: pack.packVersion,
        status: WorkflowVersionStatus.DRAFT,
        stages: {
          create: service.workflowStages.map((stage) => ({
            stageKey: stage.stageKey,
            label: stage.label,
            displayOrder: stage.displayOrder,
          })),
        },
      },
    });

    const orderedStages = [...service.workflowStages].sort(
      (a, b) => a.displayOrder - b.displayOrder,
    );
    const stepIds: string[] = [];
    for (const stage of orderedStages) {
      let functionAuthorityRecordId: string | undefined;
      if (stage.authorityFunctionCode) {
        const far = await tx.functionAuthorityRecord.findUniqueOrThrow({
          where: { code: stage.authorityFunctionCode },
        });
        functionAuthorityRecordId = far.id;
      }

      const step = await tx.workflowStepDefinition.create({
        data: {
          workflowVersionId: workflowVersion.id,
          stepKey: stage.stageKey,
          label: stage.label,
          stepType: mapWorkflowStepType(stage.stepType),
          consequenceLevel: mapConsequenceLevel(stage.consequenceLevel),
          functionAuthorityRecordId,
          authorityActionType: stage.authorityActionType
            ? (stage.authorityActionType as AuthorityActionType)
            : undefined,
          displayOrder: stage.displayOrder,
        },
      });
      stepIds.push(step.id);
    }

    for (let index = 0; index < stepIds.length - 1; index += 1) {
      const fromStepId = stepIds[index];
      const toStepId = stepIds[index + 1];
      const fromStage = orderedStages[index];
      const toStage = orderedStages[index + 1];
      if (!fromStepId || !toStepId || !fromStage || !toStage) {
        continue;
      }

      await tx.workflowTransitionDefinition.create({
        data: {
          workflowVersionId: workflowVersion.id,
          fromStepId,
          toStepId,
          transitionKey: `${fromStage.stageKey}-to-${toStage.stageKey}`,
          joinType: WorkflowTransitionJoinType.ALL_REQUIRED,
        },
      });
    }

    const entries = [
      {
        domain: ServicePackDeploymentBindingDomain.SERVICE_CATALOG,
        entityId: serviceVersion.id,
        entityVersion: pack.packVersion,
        snapshot: {
          serviceCode,
          packId: pack.packId,
          packVersion: pack.packVersion,
        },
      },
      {
        domain: ServicePackDeploymentBindingDomain.FORMS,
        entityId: formDefinition.id,
        entityVersion: String(formVersion.version),
      },
      {
        domain: ServicePackDeploymentBindingDomain.WORKFLOWS,
        entityId: workflowDefinition.id,
        entityVersion: workflowVersion.version,
      },
      {
        domain: ServicePackDeploymentBindingDomain.SERVICE_AUTHORITY_MAPPINGS,
        entityId: serviceVersion.id,
        entityVersion: pack.packVersion,
      },
      ...feeDefinitionIds.map((entityId) => ({
        domain: ServicePackDeploymentBindingDomain.FEE_METADATA,
        entityId,
      })),
      ...checklistItemIds.map((entityId) => ({
        domain: ServicePackDeploymentBindingDomain.EVIDENCE_REQUIREMENTS,
        entityId,
      })),
      ...outputDefinitionIds.map((entityId) => ({
        domain: ServicePackDeploymentBindingDomain.OUTPUT_METADATA,
        entityId,
      })),
      ...redressRouteIds.map((entityId) => ({
        domain: ServicePackDeploymentBindingDomain.REDRESS_ROUTES,
        entityId,
      })),
      {
        domain: ServicePackDeploymentBindingDomain.COMMUNICATION_CONFIGURATION,
        entityId: serviceVersion.id,
        snapshot: { communications: service.communications },
      },
      {
        domain: ServicePackDeploymentBindingDomain.DASHBOARD_CONFIGURATION,
        entityId: serviceVersion.id,
        snapshot: {
          dashboardIndicators: service.dashboardIndicators,
          slaRules: service.slaRules,
        },
      },
    ];

    return {
      serviceVersionId: serviceVersion.id,
      serviceVersionLabel: pack.packVersion,
      formDefinitionId: formDefinition.id,
      formVersionId: formVersion.id,
      workflowDefinitionId: workflowDefinition.id,
      workflowVersionId: workflowVersion.id,
      feeDefinitionIds,
      checklistItemIds,
      outputDefinitionIds,
      redressRouteIds,
      entries,
    };
  }
}
