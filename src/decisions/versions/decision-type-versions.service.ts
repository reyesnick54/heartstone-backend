import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DecisionOutcomeCode, DecisionTypeLifecycleStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { DecisionCatalogBoundaryService } from '../common/decision-catalog-boundary.service';
import { DecisionCatalogValidationService } from '../common/decision-catalog-validation.service';
import { CreateDecisionTypeVersionDto } from './dto/create-decision-type-version.dto';
import { DecisionTypeVersionResponseDto } from './dto/decision-type-version-response.dto';

type VersionWithRelations = Prisma.DecisionTypeVersionGetPayload<{
  include: {
    permissibleOutcomes: { include: { permissibleOutcomeDefinition: true } };
    requirementElements: true;
  };
}>;

@Injectable()
export class DecisionTypeVersionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validation: DecisionCatalogValidationService,
    private readonly boundary: DecisionCatalogBoundaryService,
  ) {}

  async createForDefinition(
    decisionTypeDefinitionId: string,
    dto: CreateDecisionTypeVersionDto,
  ): Promise<DecisionTypeVersionResponseDto> {
    this.validation.assertClientCannotSetLifecycleStatus(dto as unknown as Record<string, unknown>);
    await this.validation.ensureDecisionTypeExists(decisionTypeDefinitionId);
    await this.validation.ensureFunctionAuthorityRecordExists(dto.functionAuthorityRecordId);
    this.validation.assertRequiredAuthorityActionIsFinalDecision(dto.requiredAuthorityAction);
    this.validation.assertAuthorizedDecisionMakerType(
      dto.authorizedDecisionMakerType ?? 'OFFICEHOLDER',
    );
    this.validation.assertRequirementElementsDoNotSubstituteFinalDecision(
      dto.requirementElements ?? [],
    );

    const outcomeDefinitionIds = await this.validation.resolveOutcomeDefinitionIds(
      dto.permissibleOutcomeCodes,
    );

    const created = await this.prisma.$transaction(async (tx) => {
      const version = await tx.decisionTypeVersion.create({
        data: {
          decisionTypeDefinitionId,
          version: dto.version,
          functionAuthorityRecordId: dto.functionAuthorityRecordId,
          requiredAuthorityAction: dto.requiredAuthorityAction,
          governmentServiceVersionId: dto.governmentServiceVersionId,
          governingSourceId: dto.governingSourceId,
          decisionStandardDescription: dto.decisionStandardDescription,
          matterScopeDescription: dto.matterScopeDescription,
          effectiveFrom: dto.effectiveFrom,
          effectiveUntil: dto.effectiveUntil,
          requiresFrozenEvidencePacket: dto.requiresFrozenEvidencePacket ?? false,
          requiredEvidencePacketPurpose: dto.requiredEvidencePacketPurpose,
          requiresIndependentReviewer: dto.requiresIndependentReviewer ?? false,
          requiresConflictCheck: dto.requiresConflictCheck ?? false,
          requiresProfessionalReview: dto.requiresProfessionalReview ?? false,
          requiresGovernmentConsultation: dto.requiresGovernmentConsultation ?? false,
          requiresConcurrence: dto.requiresConcurrence ?? false,
          requiresDualControl: dto.requiresDualControl ?? false,
          requiresPanelOrQuorum: dto.requiresPanelOrQuorum ?? false,
          requiresReasons: dto.requiresReasons ?? true,
          requiresNotice: dto.requiresNotice ?? false,
          requiresSignature: dto.requiresSignature ?? true,
          requiresSeal: dto.requiresSeal ?? false,
          signatureTiming: dto.signatureTiming,
          effectiveDateRule: dto.effectiveDateRule,
          publicationStatus: dto.publicationStatus,
          reviewOrAppealConfiguration: dto.reviewOrAppealConfiguration as Prisma.InputJsonValue,
          instrumentIssuanceExpected: dto.instrumentIssuanceExpected ?? false,
          authorizedDecisionMakerType: dto.authorizedDecisionMakerType,
        },
      });

      await tx.decisionTypePermissibleOutcome.createMany({
        data: outcomeDefinitionIds.map((permissibleOutcomeDefinitionId) => ({
          decisionTypeVersionId: version.id,
          permissibleOutcomeDefinitionId,
        })),
      });

      if (dto.requirementElements?.length) {
        await tx.decisionTypeRequirementElement.createMany({
          data: dto.requirementElements.map((element) => ({
            decisionTypeVersionId: version.id,
            elementType: element.elementType,
            isRequired: element.isRequired ?? true,
            configuration: element.configuration as Prisma.InputJsonValue,
            evidencePacketPurpose: element.evidencePacketPurpose,
            consultationInstitutionId: element.consultationInstitutionId,
          })),
        });
      }

      return tx.decisionTypeVersion.findUniqueOrThrow({
        where: { id: version.id },
        include: {
          permissibleOutcomes: { include: { permissibleOutcomeDefinition: true } },
          requirementElements: true,
        },
      });
    });

    return this.toResponse(created);
  }

  async findOne(id: string): Promise<DecisionTypeVersionResponseDto> {
    const version = await this.loadVersion(id);
    return this.toResponse(version);
  }

  async findAllForDefinition(
    decisionTypeDefinitionId: string,
  ): Promise<DecisionTypeVersionResponseDto[]> {
    await this.validation.ensureDecisionTypeExists(decisionTypeDefinitionId);
    const versions = await this.prisma.decisionTypeVersion.findMany({
      where: { decisionTypeDefinitionId },
      include: {
        permissibleOutcomes: { include: { permissibleOutcomeDefinition: true } },
        requirementElements: true,
      },
      orderBy: [{ version: 'asc' }, { createdAt: 'asc' }],
    });
    return versions.map((version) => this.toResponse(version));
  }

  async supersedeVersion(
    predecessorVersionId: string,
    successorVersionId: string,
  ): Promise<DecisionTypeVersionResponseDto> {
    const predecessor = await this.loadVersion(predecessorVersionId);
    const successor = await this.loadVersion(successorVersionId);

    if (predecessor.decisionTypeDefinitionId !== successor.decisionTypeDefinitionId) {
      throw new BadRequestException('Supersession requires versions of the same decision type');
    }

    if (predecessor.status !== DecisionTypeLifecycleStatus.ACTIVE) {
      throw new BadRequestException('Only ACTIVE versions may be superseded');
    }

    if (successor.status !== DecisionTypeLifecycleStatus.ACCEPTED) {
      throw new BadRequestException('Successor version must be ACCEPTED before supersession');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.decisionTypeVersion.update({
        where: { id: predecessorVersionId },
        data: {
          status: DecisionTypeLifecycleStatus.SUPERSEDED,
          supersededByVersionId: successorVersionId,
        },
      });

      await tx.decisionTypeVersion.update({
        where: { id: successorVersionId },
        data: { status: DecisionTypeLifecycleStatus.ACTIVE, operationallyActivatedAt: new Date() },
      });

      return tx.decisionTypeVersion.findUniqueOrThrow({
        where: { id: successorVersionId },
        include: {
          permissibleOutcomes: { include: { permissibleOutcomeDefinition: true } },
          requirementElements: true,
        },
      });
    });

    return this.toResponse(updated);
  }

  assertConfiguredOutcome(version: VersionWithRelations, outcomeCode: DecisionOutcomeCode): void {
    const configuredCodes = version.permissibleOutcomes.map(
      (link) => link.permissibleOutcomeDefinition.code,
    );
    this.boundary.assertOutcomeConfigured(configuredCodes, outcomeCode);
  }

  private async loadVersion(id: string): Promise<VersionWithRelations> {
    const version = await this.prisma.decisionTypeVersion.findUnique({
      where: { id },
      include: {
        permissibleOutcomes: { include: { permissibleOutcomeDefinition: true } },
        requirementElements: true,
      },
    });

    if (!version) {
      throw new NotFoundException(`Decision type version with id "${id}" was not found`);
    }

    return version;
  }

  private toResponse(version: VersionWithRelations): DecisionTypeVersionResponseDto {
    return {
      id: version.id,
      decisionTypeDefinitionId: version.decisionTypeDefinitionId,
      version: version.version,
      functionAuthorityRecordId: version.functionAuthorityRecordId,
      requiredAuthorityAction: version.requiredAuthorityAction,
      governmentServiceVersionId: version.governmentServiceVersionId,
      governingSourceId: version.governingSourceId,
      decisionStandardDescription: version.decisionStandardDescription,
      matterScopeDescription: version.matterScopeDescription,
      effectiveFrom: version.effectiveFrom,
      effectiveUntil: version.effectiveUntil,
      status: version.status,
      requiresFrozenEvidencePacket: version.requiresFrozenEvidencePacket,
      requiredEvidencePacketPurpose: version.requiredEvidencePacketPurpose,
      requiresIndependentReviewer: version.requiresIndependentReviewer,
      requiresConflictCheck: version.requiresConflictCheck,
      requiresProfessionalReview: version.requiresProfessionalReview,
      requiresGovernmentConsultation: version.requiresGovernmentConsultation,
      requiresConcurrence: version.requiresConcurrence,
      requiresDualControl: version.requiresDualControl,
      requiresPanelOrQuorum: version.requiresPanelOrQuorum,
      requiresReasons: version.requiresReasons,
      requiresNotice: version.requiresNotice,
      requiresSignature: version.requiresSignature,
      requiresSeal: version.requiresSeal,
      signatureTiming: version.signatureTiming,
      effectiveDateRule: version.effectiveDateRule,
      publicationStatus: version.publicationStatus,
      reviewOrAppealConfiguration: version.reviewOrAppealConfiguration as Record<
        string,
        unknown
      > | null,
      instrumentIssuanceExpected: version.instrumentIssuanceExpected,
      authorizedDecisionMakerType: version.authorizedDecisionMakerType,
      supersededByVersionId: version.supersededByVersionId,
      institutionallyAcceptedAt: version.institutionallyAcceptedAt,
      operationallyActivatedAt: version.operationallyActivatedAt,
      permissibleOutcomeCodes: version.permissibleOutcomes.map(
        (link) => link.permissibleOutcomeDefinition.code,
      ),
      requirementElements: version.requirementElements.map((element) => ({
        id: element.id,
        elementType: element.elementType,
        isRequired: element.isRequired,
        configuration: element.configuration as Record<string, unknown> | null,
        evidencePacketPurpose: element.evidencePacketPurpose,
        consultationInstitutionId: element.consultationInstitutionId,
      })),
      createdAt: version.createdAt,
      updatedAt: version.updatedAt,
    };
  }
}
