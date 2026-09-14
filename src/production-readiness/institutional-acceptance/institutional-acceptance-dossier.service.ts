import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AcceptanceDossierVersionStatus,
  AcceptanceLevel,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { hashDossierContent } from '../common/dossier-hash.util';
import { ProductionReadinessBoundaryService } from '../common/production-readiness-boundary.service';

export interface CreateDossierInput {
  dossierNumber: string;
  institutionId: string;
  accountableOwnerOfficeholderId: string;
  acceptanceAuthorityFunctionRecordId: string;
  version: DossierVersionInput;
}

export interface DossierVersionInput {
  subjectSummary: string;
  scopeDescription: string;
  exclusions?: unknown[];
  versionConfiguration?: Record<string, unknown>;
  environment: string;
  releaseReference: string;
  effectiveFrom?: Date;
  effectiveUntil?: Date;
  authorityBasis: string;
  requirementsBaseline?: unknown[];
  evidenceIndex?: unknown[];
  sourceCrosswalk?: Record<string, unknown>;
  assumptions?: unknown[];
  technicalReadiness?: Record<string, unknown>;
  operationalReadiness?: Record<string, unknown>;
  workforceReadiness?: Record<string, unknown>;
  institutionalReadiness?: Record<string, unknown>;
  continuityReadiness?: Record<string, unknown>;
  integrationReadiness?: Record<string, unknown>;
  supportReadiness?: Record<string, unknown>;
  trainingQualification?: Record<string, unknown>;
  limitations?: unknown[];
  suspensionTriggers?: unknown[];
  rollbackPlan?: Record<string, unknown>;
  revalidationDate?: Date;
  subjects?: { subjectType: string; subjectReference: string; subjectLabel: string }[];
}

export interface RecordAcceptanceLevelInput {
  dossierVersionId: string;
  acceptanceLevel: AcceptanceLevel;
  achievedByIdentityId: string;
  authorityEvaluationRecordId?: string;
  basisReference?: string;
  basisType?: string;
  notes?: string;
}

@Injectable()
export class InstitutionalAcceptanceDossierService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ProductionReadinessBoundaryService,
  ) {}

  async createDossier(input: CreateDossierInput) {
    const contentHash = this.computeVersionHash(input.version);

    return this.prisma.$transaction(async (tx) => {
      const dossier = await tx.institutionalAcceptanceDossier.create({
        data: {
          dossierNumber: input.dossierNumber,
          institutionId: input.institutionId,
          accountableOwnerOfficeholderId: input.accountableOwnerOfficeholderId,
          acceptanceAuthorityFunctionRecordId: input.acceptanceAuthorityFunctionRecordId,
        },
      });

      const version = await tx.acceptanceDossierVersion.create({
        data: {
          dossierId: dossier.id,
          versionNumber: 1,
          subjectSummary: input.version.subjectSummary,
          scopeDescription: input.version.scopeDescription,
          exclusions: (input.version.exclusions ?? []) as Prisma.InputJsonValue,
          versionConfiguration: (input.version.versionConfiguration ?? {}) as Prisma.InputJsonValue,
          environment: input.version.environment,
          releaseReference: input.version.releaseReference,
          effectiveFrom: input.version.effectiveFrom,
          effectiveUntil: input.version.effectiveUntil,
          authorityBasis: input.version.authorityBasis,
          accountableOwnerOfficeholderId: input.accountableOwnerOfficeholderId,
          acceptanceAuthorityFunctionRecordId: input.acceptanceAuthorityFunctionRecordId,
          requirementsBaseline: (input.version.requirementsBaseline ?? []) as Prisma.InputJsonValue,
          evidenceIndex: (input.version.evidenceIndex ?? []) as Prisma.InputJsonValue,
          sourceCrosswalk: (input.version.sourceCrosswalk ?? {}) as Prisma.InputJsonValue,
          assumptions: (input.version.assumptions ?? []) as Prisma.InputJsonValue,
          technicalReadiness: (input.version.technicalReadiness ?? {}) as Prisma.InputJsonValue,
          operationalReadiness: (input.version.operationalReadiness ?? {}) as Prisma.InputJsonValue,
          workforceReadiness: (input.version.workforceReadiness ?? {}) as Prisma.InputJsonValue,
          institutionalReadiness: (input.version.institutionalReadiness ?? {}) as Prisma.InputJsonValue,
          continuityReadiness: (input.version.continuityReadiness ?? {}) as Prisma.InputJsonValue,
          integrationReadiness: (input.version.integrationReadiness ?? {}) as Prisma.InputJsonValue,
          supportReadiness: (input.version.supportReadiness ?? {}) as Prisma.InputJsonValue,
          trainingQualification: (input.version.trainingQualification ?? {}) as Prisma.InputJsonValue,
          limitations: (input.version.limitations ?? []) as Prisma.InputJsonValue,
          suspensionTriggers: (input.version.suspensionTriggers ?? []) as Prisma.InputJsonValue,
          rollbackPlan: (input.version.rollbackPlan ?? {}) as Prisma.InputJsonValue,
          revalidationDate: input.version.revalidationDate,
          contentHash,
        },
      });

      if (input.version.subjects?.length) {
        await tx.acceptanceSubject.createMany({
          data: input.version.subjects.map((subject) => ({
            dossierVersionId: version.id,
            ...subject,
          })),
        });
      }

      await tx.institutionalAcceptanceDossier.update({
        where: { id: dossier.id },
        data: { currentVersionId: version.id },
      });

      return { dossier, version };
    });
  }

  async createNextVersion(dossierId: string, version: DossierVersionInput) {
    const dossier = await this.prisma.institutionalAcceptanceDossier.findUnique({
      where: { id: dossierId },
      include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } },
    });

    if (!dossier) {
      throw new NotFoundException(`InstitutionalAcceptanceDossier ${dossierId} not found`);
    }

    const current = dossier.versions[0];
    if (
      current &&
      (current.status === AcceptanceDossierVersionStatus.SUBMITTED_FOR_FINAL_ACCEPTANCE ||
        current.status === AcceptanceDossierVersionStatus.FROZEN_ACCEPTED)
    ) {
      throw new BadRequestException(
        'Signed or submitted dossier versions are immutable; create a new version instead of mutating',
      );
    }

    const nextVersionNumber = (current?.versionNumber ?? 0) + 1;
    const contentHash = this.computeVersionHash(version);

    return this.prisma.$transaction(async (tx) => {
      if (current) {
        await tx.acceptanceDossierVersion.update({
          where: { id: current.id },
          data: { status: AcceptanceDossierVersionStatus.SUPERSEDED },
        });
      }

      const created = await tx.acceptanceDossierVersion.create({
        data: {
          dossierId,
          versionNumber: nextVersionNumber,
          subjectSummary: version.subjectSummary,
          scopeDescription: version.scopeDescription,
          exclusions: (version.exclusions ?? []) as Prisma.InputJsonValue,
          versionConfiguration: (version.versionConfiguration ?? {}) as Prisma.InputJsonValue,
          environment: version.environment,
          releaseReference: version.releaseReference,
          effectiveFrom: version.effectiveFrom,
          effectiveUntil: version.effectiveUntil,
          authorityBasis: version.authorityBasis,
          accountableOwnerOfficeholderId: dossier.accountableOwnerOfficeholderId,
          acceptanceAuthorityFunctionRecordId: dossier.acceptanceAuthorityFunctionRecordId,
          requirementsBaseline: (version.requirementsBaseline ?? []) as Prisma.InputJsonValue,
          evidenceIndex: (version.evidenceIndex ?? []) as Prisma.InputJsonValue,
          sourceCrosswalk: (version.sourceCrosswalk ?? {}) as Prisma.InputJsonValue,
          assumptions: (version.assumptions ?? []) as Prisma.InputJsonValue,
          technicalReadiness: (version.technicalReadiness ?? {}) as Prisma.InputJsonValue,
          operationalReadiness: (version.operationalReadiness ?? {}) as Prisma.InputJsonValue,
          workforceReadiness: (version.workforceReadiness ?? {}) as Prisma.InputJsonValue,
          institutionalReadiness: (version.institutionalReadiness ?? {}) as Prisma.InputJsonValue,
          continuityReadiness: (version.continuityReadiness ?? {}) as Prisma.InputJsonValue,
          integrationReadiness: (version.integrationReadiness ?? {}) as Prisma.InputJsonValue,
          supportReadiness: (version.supportReadiness ?? {}) as Prisma.InputJsonValue,
          trainingQualification: (version.trainingQualification ?? {}) as Prisma.InputJsonValue,
          limitations: (version.limitations ?? []) as Prisma.InputJsonValue,
          suspensionTriggers: (version.suspensionTriggers ?? []) as Prisma.InputJsonValue,
          rollbackPlan: (version.rollbackPlan ?? {}) as Prisma.InputJsonValue,
          revalidationDate: version.revalidationDate,
          contentHash,
        },
      });

      await tx.institutionalAcceptanceDossier.update({
        where: { id: dossierId },
        data: { currentVersionId: created.id },
      });

      return created;
    });
  }

  async submitForFinalAcceptance(dossierVersionId: string) {
    const version = await this.loadVersion(dossierVersionId);
    this.assertVersionMutable(version.status);

    return this.prisma.acceptanceDossierVersion.update({
      where: { id: dossierVersionId },
      data: {
        status: AcceptanceDossierVersionStatus.SUBMITTED_FOR_FINAL_ACCEPTANCE,
        submittedForFinalAcceptanceAt: new Date(),
      },
    });
  }

  async recordAcceptanceLevel(input: RecordAcceptanceLevelInput) {
    this.boundary.assertForbiddenAcceptanceBasis(input.basisType);

    const version = await this.loadVersion(input.dossierVersionId);
    this.assertVersionMutable(version.status);

    const existing = await this.prisma.acceptanceLevelAchievement.findUnique({
      where: {
        dossierVersionId_acceptanceLevel: {
          dossierVersionId: input.dossierVersionId,
          acceptanceLevel: input.acceptanceLevel,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Acceptance level ${input.acceptanceLevel} is already recorded; lower levels do not automatically create higher levels`,
      );
    }

    return this.prisma.acceptanceLevelAchievement.create({
      data: {
        dossierVersionId: input.dossierVersionId,
        acceptanceLevel: input.acceptanceLevel,
        achievedByIdentityId: input.achievedByIdentityId,
        authorityEvaluationRecordId: input.authorityEvaluationRecordId,
        basisReference: input.basisReference,
        notes: input.notes,
      },
    });
  }

  async getDossierWithVersion(dossierId: string) {
    const dossier = await this.prisma.institutionalAcceptanceDossier.findUnique({
      where: { id: dossierId },
      include: {
        currentVersion: {
          include: {
            subjects: true,
            requirements: true,
            evidenceLinks: true,
            testResults: true,
            defects: true,
            exceptions: true,
            conditions: true,
            dependencies: true,
            levelAchievements: true,
            reviews: true,
            decisions: { include: { signatures: true, conditions: true } },
            residualRisks: { include: { acceptances: { include: { conditions: true } } } },
          },
        },
        versions: { orderBy: { versionNumber: 'desc' } },
      },
    });

    if (!dossier) {
      throw new NotFoundException(`InstitutionalAcceptanceDossier ${dossierId} not found`);
    }

    return dossier;
  }

  async assertVersionFrozen(dossierVersionId: string) {
    const version = await this.loadVersion(dossierVersionId);
    if (version.status !== AcceptanceDossierVersionStatus.FROZEN_ACCEPTED) {
      throw new BadRequestException(
        'Dossier version must be frozen after signed institutional acceptance',
      );
    }
    return version;
  }

  private async loadVersion(dossierVersionId: string) {
    const version = await this.prisma.acceptanceDossierVersion.findUnique({
      where: { id: dossierVersionId },
    });
    if (!version) {
      throw new NotFoundException(`AcceptanceDossierVersion ${dossierVersionId} not found`);
    }
    return version;
  }

  private assertVersionMutable(status: AcceptanceDossierVersionStatus) {
    if (
      status === AcceptanceDossierVersionStatus.SUBMITTED_FOR_FINAL_ACCEPTANCE ||
      status === AcceptanceDossierVersionStatus.FROZEN_ACCEPTED
    ) {
      throw new BadRequestException('Signed dossier version is immutable');
    }
  }

  private computeVersionHash(version: DossierVersionInput): string {
    return hashDossierContent({
      subjectSummary: version.subjectSummary,
      scopeDescription: version.scopeDescription,
      exclusions: version.exclusions ?? [],
      versionConfiguration: version.versionConfiguration ?? {},
      environment: version.environment,
      releaseReference: version.releaseReference,
      authorityBasis: version.authorityBasis,
      requirementsBaseline: version.requirementsBaseline ?? [],
      evidenceIndex: version.evidenceIndex ?? [],
    });
  }
}
