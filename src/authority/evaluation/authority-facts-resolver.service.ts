import { Injectable } from '@nestjs/common';
import {
  AuthorityActionType,
  AuthorityEvaluationOutcome,
  DecisionParticipantRole,
  EvidencePacketVersionStatus,
  HealthcareLicenseStatus,
  IdentityOfficeholderLinkStatus,
  InstitutionalActType,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import {
  type AuthorityEvaluationResourceScope,
  type DerivedAuthorityFacts,
  type ResolvedAuthorityFacts,
} from './authority-evaluation-trust.types';

export interface ResolveAuthorityFactsInput {
  identityId: string;
  officeholderId: string;
  functionAuthorityRecordId: string;
  action: AuthorityActionType;
  at: Date;
  resourceScope?: AuthorityEvaluationResourceScope;
}

@Injectable()
export class AuthorityFactsResolver {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(input: ResolveAuthorityFactsInput): Promise<ResolvedAuthorityFacts> {
    const resourceScope = input.resourceScope ?? {};
    const sourceRefs = {
      institutionalActIds: [] as string[],
      decisionParticipantIds: [] as string[],
      evidenceRecordIds: [] as string[],
      priorAuthorityEvaluationRecordIds: [] as string[],
      evidencePacketVersionId: resourceScope.evidencePacketVersionId,
      decisionReadinessAssessmentId: resourceScope.decisionReadinessAssessmentId,
    };

    const institutionalActs = await this.prisma.institutionalAuthorityAct.findMany({
      where: { functionAuthorityRecordId: input.functionAuthorityRecordId },
      orderBy: { performedAt: 'desc' },
    });
    sourceRefs.institutionalActIds = institutionalActs.map((act) => act.id);

    const actTypes = new Set(institutionalActs.map((act) => act.actType));
    const hasConsultation =
      actTypes.has(InstitutionalActType.CONSULTATION) ||
      actTypes.has(InstitutionalActType.CONCURRENCE);
    const hasSupervision = actTypes.has(InstitutionalActType.SUPERVISION);
    const hasLiaison = actTypes.has(InstitutionalActType.LIAISON);

    const readinessAssessmentId = await this.resolveReadinessAssessmentId(
      resourceScope,
      input.identityId,
      input.officeholderId,
    );
    if (readinessAssessmentId) {
      sourceRefs.decisionReadinessAssessmentId = readinessAssessmentId;
    }

    const participantState = await this.resolveParticipantState(
      readinessAssessmentId,
      input.identityId,
      input.officeholderId,
    );
    sourceRefs.decisionParticipantIds = participantState.participantIds;

    const evidenceProvided = await this.resolveEvidenceCodes(resourceScope, sourceRefs);

    const qualificationCodes = await this.resolveQualificationCodes(input.identityId, input.at);

    const priorActions = await this.resolvePriorActions(
      input.functionAuthorityRecordId,
      input.officeholderId,
      resourceScope.caseId,
      sourceRefs,
    );

    const isSelfApproval = await this.resolveSelfApproval(
      input.identityId,
      input.officeholderId,
      input.action,
      resourceScope.caseId,
      readinessAssessmentId,
    );

    const facts: DerivedAuthorityFacts = {
      evidenceProvided,
      qualificationCodes,
      hasSecondApproval: participantState.hasSecondApproval,
      hasConsultation,
      hasSupervision,
      hasLiaison,
      isSelfApproval,
      isConflicted: participantState.isConflicted,
      isRecused: participantState.isRecused,
      priorActions,
    };

    return { facts, sourceRefs };
  }

  private async resolveReadinessAssessmentId(
    resourceScope: AuthorityEvaluationResourceScope,
    identityId: string,
    officeholderId: string,
  ): Promise<string | undefined> {
    if (resourceScope.decisionReadinessAssessmentId) {
      return resourceScope.decisionReadinessAssessmentId;
    }

    if (!resourceScope.caseId) {
      return undefined;
    }

    const assessment = await this.prisma.decisionReadinessAssessment.findFirst({
      where: {
        caseId: resourceScope.caseId,
        OR: [
          { proposedDecisionMakerIdentityId: identityId },
          { proposedDecisionMakerOfficeholderId: officeholderId },
        ],
      },
      orderBy: { assessedAt: 'desc' },
      select: { id: true },
    });

    return assessment?.id;
  }

  private async resolveParticipantState(
    readinessAssessmentId: string | undefined,
    identityId: string,
    officeholderId: string,
  ): Promise<{
    participantIds: string[];
    hasSecondApproval: boolean;
    isConflicted: boolean;
    isRecused: boolean;
  }> {
    if (!readinessAssessmentId) {
      return {
        participantIds: [],
        hasSecondApproval: false,
        isConflicted: false,
        isRecused: false,
      };
    }

    const participants = await this.prisma.decisionParticipant.findMany({
      where: { readinessAssessmentId },
    });

    const actorParticipant = participants.find(
      (item) =>
        item.identityId === identityId ||
        (item.officeholderId !== null && item.officeholderId === officeholderId),
    );

    const coApprovers = participants.filter(
      (item) => item.role === DecisionParticipantRole.CO_APPROVER && item.hasApproved,
    );

    const hasSecondApproval = coApprovers.some(
      (item) => item.identityId !== identityId && item.officeholderId !== officeholderId,
    );

    const isRecused =
      actorParticipant?.isRecused === true ||
      actorParticipant?.role === DecisionParticipantRole.RECUSED ||
      participants.some(
        (item) =>
          item.role === DecisionParticipantRole.RECUSED &&
          (item.identityId === identityId || item.officeholderId === officeholderId),
      );

    const isConflicted = actorParticipant?.isConflicted === true;

    const participantIds = participants
      .filter(
        (item) =>
          item.identityId === identityId ||
          item.officeholderId === officeholderId ||
          item.role === DecisionParticipantRole.CO_APPROVER,
      )
      .map((item) => item.id);

    return { participantIds, hasSecondApproval, isConflicted, isRecused };
  }

  private async resolveEvidenceCodes(
    resourceScope: AuthorityEvaluationResourceScope,
    sourceRefs: ResolvedAuthorityFacts['sourceRefs'],
  ): Promise<string[]> {
    const packetVersionId =
      resourceScope.evidencePacketVersionId ??
      (resourceScope.caseId
        ? await this.resolveLatestUsablePacketVersionId(resourceScope.caseId)
        : undefined);

    if (!packetVersionId) {
      return [];
    }

    sourceRefs.evidencePacketVersionId = packetVersionId;

    const items = await this.prisma.evidencePacketItem.findMany({
      where: {
        packetVersionId,
        isExplicitlyExcluded: false,
      },
      include: {
        evidenceRecord: {
          select: {
            id: true,
            evidenceNumber: true,
            externalRecordReference: true,
            status: true,
          },
        },
      },
    });

    const codes = new Set<string>();
    for (const item of items) {
      sourceRefs.evidenceRecordIds.push(item.evidenceRecord.id);
      codes.add(item.evidenceRecord.evidenceNumber);
      if (item.evidenceRecord.externalRecordReference) {
        codes.add(item.evidenceRecord.externalRecordReference);
      }
    }

    return [...codes];
  }

  private async resolveLatestUsablePacketVersionId(caseId: string): Promise<string | undefined> {
    const packet = await this.prisma.evidencePacket.findFirst({
      where: { caseId },
      orderBy: { createdAt: 'desc' },
      include: {
        versions: {
          where: {
            status: {
              in: [
                EvidencePacketVersionStatus.ASSEMBLED,
                EvidencePacketVersionStatus.FROZEN,
                EvidencePacketVersionStatus.UNDER_REVIEW,
              ],
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    const version = packet?.versions[0];
    if (!version) {
      return undefined;
    }

    return version.id;
  }

  private async resolveQualificationCodes(identityId: string, at: Date): Promise<string[]> {
    const codes = new Set<string>();

    const identity = await this.prisma.identity.findUnique({
      where: { id: identityId },
      select: { personId: true },
    });

    const professionalFilter = identity?.personId
      ? {
          OR: [{ linkedPlatformIdentityId: identityId }, { personId: identity.personId }],
        }
      : { linkedPlatformIdentityId: identityId };

    const licenses = await this.prisma.healthcareProfessionalLicense.findMany({
      where: {
        status: HealthcareLicenseStatus.ACTIVE,
        healthcareProfessional: professionalFilter,
      },
      select: { licenseTypeCode: true, expiresAt: true },
    });

    for (const license of licenses) {
      if (license.expiresAt && license.expiresAt <= at) {
        continue;
      }
      codes.add(license.licenseTypeCode);
    }

    const educator = await this.prisma.educatorProfileReference.findFirst({
      where: { educatorIdentityId: identityId },
      select: { id: true },
    });

    if (educator) {
      const educationQualifications =
        await this.prisma.professionalEducationQualificationReference.findMany({
          where: { educatorProfileReferenceId: educator.id },
          select: { qualificationCode: true },
        });
      for (const qualification of educationQualifications) {
        codes.add(qualification.qualificationCode);
      }
    }

    const link = await this.prisma.identityOfficeholderLink.findFirst({
      where: {
        identityId,
        status: IdentityOfficeholderLinkStatus.ACTIVE,
      },
      select: { officeholderId: true },
    });

    if (link) {
      const acts = await this.prisma.institutionalAuthorityAct.findMany({
        where: {
          actorOfficeholderId: link.officeholderId,
          actType: InstitutionalActType.PROFESSIONAL_DETERMINATION,
        },
        select: { decisionOrAction: true, evidenceReference: true },
      });
      for (const act of acts) {
        if (act.evidenceReference) {
          codes.add(act.evidenceReference);
        }
        codes.add(act.decisionOrAction);
      }
    }

    return [...codes];
  }

  private async resolvePriorActions(
    functionAuthorityRecordId: string,
    officeholderId: string,
    caseId: string | undefined,
    sourceRefs: ResolvedAuthorityFacts['sourceRefs'],
  ): Promise<AuthorityActionType[]> {
    const prior = new Set<AuthorityActionType>();

    const evaluations = await this.prisma.authorityEvaluationRecord.findMany({
      where: {
        functionAuthorityRecordId,
        officeholderId,
        outcome: AuthorityEvaluationOutcome.ALLOW,
      },
      select: { id: true, action: true, contextSnapshot: true },
      orderBy: { evaluatedAt: 'desc' },
      take: 50,
    });

    for (const record of evaluations) {
      if (caseId) {
        const snapshot = record.contextSnapshot as {
          resourceScope?: { caseId?: string };
        } | null;
        if (snapshot?.resourceScope?.caseId !== caseId) {
          continue;
        }
      }
      sourceRefs.priorAuthorityEvaluationRecordIds.push(record.id);
      prior.add(record.action);
    }

    if (caseId) {
      const decisions = await this.prisma.governmentDecision.findMany({
        where: {
          caseId,
          decisionMakerOfficeholderId: officeholderId,
        },
        select: { lifecycleDecisionType: true },
      });

      for (const decision of decisions) {
        const mapped = this.mapDecisionTypeToAction(decision.lifecycleDecisionType);
        if (mapped) {
          prior.add(mapped);
        }
      }
    }

    return [...prior];
  }

  private mapDecisionTypeToAction(
    lifecycleType: string | null | undefined,
  ): AuthorityActionType | null {
    if (!lifecycleType) {
      return null;
    }
    const normalized = lifecycleType.toUpperCase();
    if (normalized.includes('APPROVE')) {
      return AuthorityActionType.APPROVE;
    }
    if (normalized.includes('DECIDE')) {
      return AuthorityActionType.DECIDE;
    }
    if (normalized.includes('ISSUE')) {
      return AuthorityActionType.ISSUE;
    }
    return null;
  }

  private async resolveSelfApproval(
    identityId: string,
    officeholderId: string,
    action: AuthorityActionType,
    caseId: string | undefined,
    readinessAssessmentId: string | undefined,
  ): Promise<boolean> {
    const decidingActions: AuthorityActionType[] = [
      AuthorityActionType.APPROVE,
      AuthorityActionType.DECIDE,
    ];
    if (!decidingActions.includes(action)) {
      return false;
    }

    if (caseId) {
      const caseRecord = await this.prisma.case.findUnique({
        where: { id: caseId },
        select: { applicantIdentityId: true },
      });
      if (caseRecord?.applicantIdentityId === identityId) {
        return true;
      }
    }

    if (readinessAssessmentId) {
      const assessment = await this.prisma.decisionReadinessAssessment.findUnique({
        where: { id: readinessAssessmentId },
        select: { caseId: true, proposedDecisionMakerIdentityId: true },
      });
      if (assessment) {
        const caseRecord = await this.prisma.case.findUnique({
          where: { id: assessment.caseId },
          select: { applicantIdentityId: true },
        });
        if (
          caseRecord?.applicantIdentityId === identityId &&
          assessment.proposedDecisionMakerIdentityId === identityId
        ) {
          return true;
        }
      }
    }

    return false;
  }
}
