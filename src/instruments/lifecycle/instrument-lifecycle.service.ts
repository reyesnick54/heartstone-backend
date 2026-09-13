import { createHash, randomUUID } from 'node:crypto';

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  InstrumentJurisdictionScope,
  InstrumentLifecycleDecisionType,
  InstrumentLifecycleEventType,
  InstrumentLifecycleStatus,
  OfficialInstrument,
  OfficialInstrumentType,
  PriorVersionTreatment,
  Prisma,
  ReviewInterimEffect,
  ReviewStayStatus,
  SurrenderType,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { InstrumentLifecycleBoundaryService } from '../common/instrument-lifecycle-boundary.service';
import { GovernmentDecisionService } from './government-decision.service';
import { InstrumentLifecycleGuardService } from './instrument-lifecycle-guard.service';
import { InstrumentVerificationService } from './instrument-verification.service';

export interface IssueInstrumentInput {
  instrumentNumber: string;
  instrumentType: OfficialInstrumentType;
  jurisdictionScope?: InstrumentJurisdictionScope;
  issuerInstitutionId: string;
  lifecycleOriginalDecisionId: string;
  holderIdentityId?: string;
  caseId?: string;
  masterAdministrativeFileId?: string;
  governmentServiceVersionId?: string;
  contentReference: string;
  contentHash?: string;
  scopeDescription?: string;
  effectiveFrom?: Date;
  effectiveUntil?: Date;
  actorIdentityId?: string;
  actorOfficeholderId?: string;
}

export interface AmendInstrumentInput {
  officialInstrumentId: string;
  controllingDecisionId: string;
  authorityReference: string;
  affectedScope: string;
  affectedRights?: unknown[];
  affectedConditions?: unknown[];
  evidenceIds?: string[];
  consultationRequired?: boolean;
  consultationCompleted?: boolean;
  noticeReference?: string;
  reviewRightsReference?: string;
  effectiveAt: Date;
  priorVersionTreatment: PriorVersionTreatment;
  newContentReference: string;
  newContentHash?: string;
  actorIdentityId?: string;
  actorOfficeholderId?: string;
}

export interface ClericalCorrectionInput {
  officialInstrumentId: string;
  controllingDecisionId: string;
  correctedContentReference: string;
  correctedContentHash?: string;
  altersDecisionOutcome?: boolean;
  altersScope?: boolean;
  altersRights?: boolean;
  altersObligations?: boolean;
  altersMaterialCondition?: boolean;
  altersHolder?: boolean;
  altersLegalEffect?: boolean;
  actorIdentityId?: string;
}

export interface RenewInstrumentInput {
  officialInstrumentId: string;
  controllingDecisionId: string;
  authorityReference: string;
  currentEvidenceIds: string[];
  identityVerified: boolean;
  ownershipVerified: boolean;
  conditionsPerformanceVerified: boolean;
  inspectionHistoryVerified?: boolean;
  professionalStatusVerified?: boolean;
  feesVerified?: boolean;
  priorApprovalReliedUpon?: boolean;
  paymentReceived?: boolean;
  newEffectiveFrom: Date;
  newEffectiveUntil?: Date;
  newContentReference: string;
  newContentHash?: string;
  noticeReference?: string;
  actorIdentityId?: string;
}

export interface SuspendInstrumentInput {
  officialInstrumentId: string;
  controllingDecisionId: string;
  authorityReference: string;
  triggerReference: string;
  evidenceIds?: string[];
  urgencyLevel?: string;
  scopeDescription?: string;
  partialScope?: Record<string, unknown>;
  noticeReference?: string;
  opportunityToRespondProvided?: boolean;
  interimActionReference?: string;
  reasonsReference: string;
  effectiveAt: Date;
  durationUntil?: Date;
  conditions?: unknown[];
  reviewRightsReference?: string;
  downstreamNotifications?: unknown[];
  executedByIdentityId?: string;
  isPartial?: boolean;
  actorRoleMarker?: string;
  isCreatingDecision?: boolean;
}

export interface RevokeInstrumentInput {
  officialInstrumentId: string;
  controllingDecisionId: string;
  authorityReference: string;
  groundsReference: string;
  evidenceIds?: string[];
  noticeReference?: string;
  opportunityToRespondProvided?: boolean;
  reasonsReference: string;
  effectiveAt: Date;
  continuingObligations?: unknown[];
  reviewRightsReference?: string;
  downstreamNotifications?: unknown[];
  closureRemediationReference?: string;
  representsNationalRevocation?: boolean;
  actorIdentityId?: string;
}

export interface ReinstateInstrumentInput {
  officialInstrumentId: string;
  controllingDecisionId: string;
  authorityReference: string;
  priorSuspensionRecordId?: string;
  priorRevocationRecordId?: string;
  correctiveEvidenceIds: string[];
  inspectionVerified: boolean;
  professionalVerified: boolean;
  effectiveAt: Date;
  continuingConditions?: unknown[];
  priorSuspensionExpired?: boolean;
  actorIdentityId?: string;
}

export interface SurrenderInstrumentInput {
  officialInstrumentId: string;
  controllingDecisionId?: string;
  surrenderType: SurrenderType;
  applicantRequestReference?: string;
  institutionalAcceptanceReference?: string;
  effectiveAt: Date;
  continuingObligations?: unknown[];
  recordsRetentionReference?: string;
  downstreamEffects?: unknown[];
  actorIdentityId?: string;
}

export interface FileReviewReferenceInput {
  challengedDecisionId: string;
  challengedInstrumentId?: string;
  reviewRoute: string;
  reviewAuthority: string;
  filedAt: Date;
  deadline?: Date;
  appellantIdentityId?: string;
  appellantOfficeholderId?: string;
  groundsReference?: string;
}

export interface AuthorizeStayInput {
  reviewReferenceId: string;
  interimEffect: ReviewInterimEffect;
  stayStatus: ReviewStayStatus;
}

@Injectable()
export class InstrumentLifecycleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: InstrumentLifecycleBoundaryService,
    private readonly guard: InstrumentLifecycleGuardService,
    private readonly verification: InstrumentVerificationService,
    private readonly decisionService: GovernmentDecisionService,
  ) {}

  async issueInstrument(input: IssueInstrumentInput): Promise<OfficialInstrument> {
    await this.decisionService.assertDecisionFinalized(input.lifecycleOriginalDecisionId);

    const token = randomUUID();
    const contentHash = input.contentHash ?? this.hashContent(input.contentReference);

    const instrument = await this.prisma.officialInstrument.create({
      data: {
        instrumentNumber: input.instrumentNumber,
        instrumentType: input.instrumentType,
        jurisdictionScope: input.jurisdictionScope ?? InstrumentJurisdictionScope.NATIONAL,
        lifecycleStatus: InstrumentLifecycleStatus.ISSUED,
        holderIdentityId: input.holderIdentityId,
        caseId: input.caseId,
        masterAdministrativeFileId: input.masterAdministrativeFileId,
        governmentServiceVersionId: input.governmentServiceVersionId,
        issuerInstitutionId: input.issuerInstitutionId,
        issuerOfficeholderId: input.actorOfficeholderId ?? input.issuerInstitutionId,
        lifecycleOriginalDecisionId: input.lifecycleOriginalDecisionId,
        effectiveFrom: input.effectiveFrom,
        effectiveUntil: input.effectiveUntil,
        publicVerificationToken: token,
        publicVerificationStatus: 'VALID',
        versions: {
          create: {
            versionNumber: 1,
            isCurrentLifecycle: true,
            contentReference: input.contentReference,
            contentHash,
            scopeDescription: input.scopeDescription,
            lifecycleEffectiveFrom: input.effectiveFrom,
            lifecycleEffectiveUntil: input.effectiveUntil,
            lifecycleCreatedByDecisionId: input.lifecycleOriginalDecisionId,
          },
        },
      },
      include: { versions: true },
    });

    const version = instrument.versions[0];
    if (!version) {
      throw new BadRequestException('Issued instrument version was not created');
    }

    await this.prisma.officialInstrument.update({
      where: { id: instrument.id },
      data: { currentVersionId: version.id },
    });

    await this.recordLifecycleEvent({
      officialInstrumentId: instrument.id,
      eventType: InstrumentLifecycleEventType.ISSUED,
      controllingDecisionId: input.lifecycleOriginalDecisionId,
      newStatus: InstrumentLifecycleStatus.ISSUED,
      effectiveAt: input.effectiveFrom ?? new Date(),
      actorIdentityId: input.actorIdentityId,
      actorOfficeholderId: input.actorOfficeholderId,
    });

    return this.prisma.officialInstrument.findUniqueOrThrow({
      where: { id: instrument.id },
      include: { versions: true, lifecycleEvents: true },
    });
  }

  async amendInstrument(input: AmendInstrumentInput): Promise<OfficialInstrument> {
    await this.guard.assertNoConflictingPendingOperations(
      input.officialInstrumentId,
      InstrumentLifecycleEventType.AMENDED,
    );

    const decision = await this.decisionService.assertDecisionFinalized(
      input.controllingDecisionId,
    );
    this.boundary.assertDecisionTypeMatchesLifecycleAction(decision.decisionType, [
      InstrumentLifecycleDecisionType.AMEND,
      InstrumentLifecycleDecisionType.APPROVE_WITH_CONDITIONS,
    ]);

    const instrument = await this.getInstrumentWithCurrentVersion(input.officialInstrumentId);
    this.boundary.assertInstrumentStatusAllowsAction(
      instrument.lifecycleStatus,
      this.guard.getAllowedStatusesForAction(InstrumentLifecycleEventType.AMENDED),
      'amendment',
    );

    const priorVersion = instrument.currentVersion;
    if (!priorVersion) {
      throw new BadRequestException('Instrument has no current version for amendment');
    }

    const newContentHash = input.newContentHash ?? this.hashContent(input.newContentReference);
    const nextVersionNumber = priorVersion.versionNumber + 1;

    const newVersion = await this.prisma.officialInstrumentVersion.create({
      data: {
        officialInstrumentId: instrument.id,
        versionNumber: nextVersionNumber,
        isCurrentLifecycle: true,
        contentReference: input.newContentReference,
        contentHash: newContentHash,
        scopeDescription: input.affectedScope,
        rightsAndObligations: this.asJson(input.affectedRights ?? []),
        lifecycleConditions: this.asJson(input.affectedConditions ?? []),
        lifecycleEffectiveFrom: input.effectiveAt,
        priorVersionTreatment: input.priorVersionTreatment,
        lifecycleCreatedByDecisionId: input.controllingDecisionId,
      },
    });

    await this.prisma.officialInstrumentVersion.update({
      where: { id: priorVersion.id },
      data: {
        isCurrentLifecycle: false,
        supersededByVersionId: newVersion.id,
      },
    });

    await this.prisma.instrumentAmendmentRecord.create({
      data: {
        officialInstrumentId: instrument.id,
        priorVersionId: priorVersion.id,
        newVersionId: newVersion.id,
        controllingDecisionId: input.controllingDecisionId,
        authorityReference: input.authorityReference,
        affectedScope: input.affectedScope,
        affectedRights: this.asJson(input.affectedRights ?? []),
        affectedConditions: this.asJson(input.affectedConditions ?? []),
        evidenceIds: input.evidenceIds ?? [],
        consultationRequired: input.consultationRequired ?? false,
        consultationCompleted: input.consultationCompleted ?? false,
        noticeReference: input.noticeReference,
        reviewRightsReference: input.reviewRightsReference,
        effectiveAt: input.effectiveAt,
        priorVersionTreatment: input.priorVersionTreatment,
      },
    });

    await this.prisma.officialInstrument.update({
      where: { id: instrument.id },
      data: { currentVersionId: newVersion.id },
    });

    await this.recordLifecycleEvent({
      officialInstrumentId: instrument.id,
      eventType: InstrumentLifecycleEventType.AMENDED,
      controllingDecisionId: input.controllingDecisionId,
      priorStatus: instrument.lifecycleStatus,
      newStatus: InstrumentLifecycleStatus.AMENDED,
      effectiveAt: input.effectiveAt,
      actorIdentityId: input.actorIdentityId,
      actorOfficeholderId: input.actorOfficeholderId,
    });

    return this.getInstrument(input.officialInstrumentId);
  }

  async correctClerical(input: ClericalCorrectionInput): Promise<OfficialInstrument> {
    this.boundary.assertClericalCorrectionScope(input);
    await this.decisionService.assertDecisionFinalized(input.controllingDecisionId);

    const instrument = await this.getInstrumentWithCurrentVersion(input.officialInstrumentId);
    const priorVersion = instrument.currentVersion;
    if (!priorVersion) {
      throw new BadRequestException('Instrument has no current version for clerical correction');
    }

    const correctedHash =
      input.correctedContentHash ?? this.hashContent(input.correctedContentReference);

    const newVersion = await this.prisma.officialInstrumentVersion.create({
      data: {
        officialInstrumentId: instrument.id,
        versionNumber: priorVersion.versionNumber + 1,
        isCurrentLifecycle: true,
        contentReference: input.correctedContentReference,
        contentHash: correctedHash,
        scopeDescription: priorVersion.scopeDescription,
        rightsAndObligations: this.asJson(priorVersion.rightsAndObligations),
        lifecycleConditions: this.asJson(priorVersion.lifecycleConditions),
        lifecycleEffectiveFrom: priorVersion.lifecycleEffectiveFrom,
        lifecycleEffectiveUntil: priorVersion.lifecycleEffectiveUntil,
        priorVersionTreatment: PriorVersionTreatment.RETAINED_HISTORICAL,
        lifecycleCreatedByDecisionId: input.controllingDecisionId,
      },
    });

    await this.prisma.officialInstrumentVersion.update({
      where: { id: priorVersion.id },
      data: { isCurrentLifecycle: false, supersededByVersionId: newVersion.id },
    });

    await this.prisma.officialInstrument.update({
      where: { id: instrument.id },
      data: { currentVersionId: newVersion.id },
    });

    await this.recordLifecycleEvent({
      officialInstrumentId: instrument.id,
      eventType: InstrumentLifecycleEventType.CORRECTED_CLERICAL,
      controllingDecisionId: input.controllingDecisionId,
      priorStatus: instrument.lifecycleStatus,
      newStatus: instrument.lifecycleStatus,
      effectiveAt: new Date(),
      actorIdentityId: input.actorIdentityId,
    });

    return this.getInstrument(input.officialInstrumentId);
  }

  async renewInstrument(input: RenewInstrumentInput): Promise<OfficialInstrument> {
    await this.guard.assertNoConflictingPendingOperations(
      input.officialInstrumentId,
      InstrumentLifecycleEventType.RENEWED,
    );

    const decision = await this.decisionService.assertDecisionFinalized(
      input.controllingDecisionId,
    );

    this.guard.assertRenewalEligibility({
      currentEvidenceIds: input.currentEvidenceIds,
      identityVerified: input.identityVerified,
      ownershipVerified: input.ownershipVerified,
      conditionsPerformanceVerified: input.conditionsPerformanceVerified,
      priorApprovalReliedUpon: input.priorApprovalReliedUpon ?? false,
      paymentReceived: input.paymentReceived ?? false,
      decisionFinalized: decision.status === 'FINALIZED',
    });

    const instrument = await this.getInstrumentWithCurrentVersion(input.officialInstrumentId);
    const priorVersion = instrument.currentVersion;
    if (!priorVersion) {
      throw new BadRequestException('Instrument has no current version for renewal');
    }

    const newContentHash = input.newContentHash ?? this.hashContent(input.newContentReference);

    const newVersion = await this.prisma.officialInstrumentVersion.create({
      data: {
        officialInstrumentId: instrument.id,
        versionNumber: priorVersion.versionNumber + 1,
        isCurrentLifecycle: true,
        contentReference: input.newContentReference,
        contentHash: newContentHash,
        lifecycleEffectiveFrom: input.newEffectiveFrom,
        lifecycleEffectiveUntil: input.newEffectiveUntil,
        lifecycleCreatedByDecisionId: input.controllingDecisionId,
      },
    });

    await this.prisma.officialInstrumentVersion.update({
      where: { id: priorVersion.id },
      data: { isCurrentLifecycle: false, supersededByVersionId: newVersion.id },
    });

    await this.prisma.instrumentRenewalRecord.create({
      data: {
        officialInstrumentId: instrument.id,
        priorVersionId: priorVersion.id,
        newVersionId: newVersion.id,
        controllingDecisionId: input.controllingDecisionId,
        authorityReference: input.authorityReference,
        currentEvidenceIds: input.currentEvidenceIds,
        identityVerified: input.identityVerified,
        ownershipVerified: input.ownershipVerified,
        conditionsPerformanceVerified: input.conditionsPerformanceVerified,
        inspectionHistoryVerified: input.inspectionHistoryVerified ?? false,
        professionalStatusVerified: input.professionalStatusVerified ?? false,
        feesVerified: input.feesVerified ?? false,
        priorApprovalReliedUpon: input.priorApprovalReliedUpon ?? false,
        paymentReceived: input.paymentReceived ?? false,
        newEffectiveFrom: input.newEffectiveFrom,
        newEffectiveUntil: input.newEffectiveUntil,
        noticeReference: input.noticeReference,
      },
    });

    await this.prisma.officialInstrument.update({
      where: { id: instrument.id },
      data: {
        currentVersionId: newVersion.id,
        effectiveFrom: input.newEffectiveFrom,
        effectiveUntil: input.newEffectiveUntil,
      },
    });

    await this.recordLifecycleEvent({
      officialInstrumentId: instrument.id,
      eventType: InstrumentLifecycleEventType.RENEWED,
      controllingDecisionId: input.controllingDecisionId,
      priorStatus: instrument.lifecycleStatus,
      newStatus: InstrumentLifecycleStatus.RENEWED,
      effectiveAt: input.newEffectiveFrom,
      actorIdentityId: input.actorIdentityId,
    });

    return this.getInstrument(input.officialInstrumentId);
  }

  async suspendInstrument(input: SuspendInstrumentInput): Promise<OfficialInstrument> {
    this.boundary.assertTechnicalAdminCannotCreateSuspensionDecision({
      actorRoleMarker: input.actorRoleMarker,
      isCreatingDecision: input.isCreatingDecision ?? false,
    });

    const eventType = input.isPartial
      ? InstrumentLifecycleEventType.PARTIALLY_SUSPENDED
      : InstrumentLifecycleEventType.SUSPENDED;
    const newStatus = input.isPartial
      ? InstrumentLifecycleStatus.PARTIALLY_SUSPENDED
      : InstrumentLifecycleStatus.SUSPENDED;

    await this.guard.assertNoConflictingPendingOperations(input.officialInstrumentId, eventType);
    await this.decisionService.assertDecisionFinalized(input.controllingDecisionId);

    const instrument = await this.getInstrument(input.officialInstrumentId);

    await this.prisma.instrumentSuspensionRecord.create({
      data: {
        officialInstrumentId: instrument.id,
        controllingDecisionId: input.controllingDecisionId,
        authorityReference: input.authorityReference,
        triggerReference: input.triggerReference,
        evidenceIds: input.evidenceIds ?? [],
        urgencyLevel: input.urgencyLevel,
        scopeDescription: input.scopeDescription,
        partialScope: input.partialScope ? this.asJson(input.partialScope) : undefined,
        noticeReference: input.noticeReference,
        opportunityToRespondProvided: input.opportunityToRespondProvided ?? false,
        interimActionReference: input.interimActionReference,
        reasonsReference: input.reasonsReference,
        effectiveAt: input.effectiveAt,
        durationUntil: input.durationUntil,
        conditions: this.asJson(input.conditions ?? []),
        reviewRightsReference: input.reviewRightsReference,
        downstreamNotifications: this.asJson(input.downstreamNotifications ?? []),
        executedByIdentityId: input.executedByIdentityId,
      },
    });

    await this.recordLifecycleEvent({
      officialInstrumentId: instrument.id,
      eventType,
      controllingDecisionId: input.controllingDecisionId,
      priorStatus: instrument.lifecycleStatus,
      newStatus,
      effectiveAt: input.effectiveAt,
      actorIdentityId: input.executedByIdentityId,
      metadata: input.partialScope ? { partialScope: input.partialScope } : {},
    });

    return this.getInstrument(input.officialInstrumentId);
  }

  async revokeInstrument(input: RevokeInstrumentInput): Promise<OfficialInstrument> {
    await this.guard.assertNoConflictingPendingOperations(
      input.officialInstrumentId,
      InstrumentLifecycleEventType.REVOKED,
    );
    await this.decisionService.assertDecisionFinalized(input.controllingDecisionId);

    const instrument = await this.getInstrument(input.officialInstrumentId);

    this.boundary.assertAbsezRevocationNotNational({
      jurisdictionScope: instrument.jurisdictionScope,
      representsNationalRevocation: input.representsNationalRevocation ?? true,
    });

    await this.prisma.instrumentRevocationRecord.create({
      data: {
        officialInstrumentId: instrument.id,
        controllingDecisionId: input.controllingDecisionId,
        authorityReference: input.authorityReference,
        groundsReference: input.groundsReference,
        evidenceIds: input.evidenceIds ?? [],
        noticeReference: input.noticeReference,
        opportunityToRespondProvided: input.opportunityToRespondProvided ?? false,
        reasonsReference: input.reasonsReference,
        effectiveAt: input.effectiveAt,
        continuingObligations: this.asJson(input.continuingObligations ?? []),
        reviewRightsReference: input.reviewRightsReference,
        downstreamNotifications: this.asJson(input.downstreamNotifications ?? []),
        closureRemediationReference: input.closureRemediationReference,
        representsNationalRevocation: input.representsNationalRevocation ?? true,
      },
    });

    await this.recordLifecycleEvent({
      officialInstrumentId: instrument.id,
      eventType: InstrumentLifecycleEventType.REVOKED,
      controllingDecisionId: input.controllingDecisionId,
      priorStatus: instrument.lifecycleStatus,
      newStatus: InstrumentLifecycleStatus.REVOKED,
      effectiveAt: input.effectiveAt,
      actorIdentityId: input.actorIdentityId,
    });

    return this.getInstrument(input.officialInstrumentId);
  }

  async reinstateInstrument(input: ReinstateInstrumentInput): Promise<OfficialInstrument> {
    await this.guard.assertNoConflictingPendingOperations(
      input.officialInstrumentId,
      InstrumentLifecycleEventType.REINSTATED,
    );

    const decision = await this.decisionService.assertDecisionFinalized(
      input.controllingDecisionId,
    );

    this.guard.assertReinstatementPrerequisitesResolved({
      priorSuspensionExpired: input.priorSuspensionExpired ?? false,
      correctiveEvidenceProvided: input.correctiveEvidenceIds.length > 0,
      inspectionVerified: input.inspectionVerified,
      professionalVerified: input.professionalVerified,
      newDecisionFinalized: decision.status === 'FINALIZED',
    });

    const instrument = await this.getInstrument(input.officialInstrumentId);

    await this.prisma.instrumentReinstatementRecord.create({
      data: {
        officialInstrumentId: instrument.id,
        controllingDecisionId: input.controllingDecisionId,
        priorSuspensionRecordId: input.priorSuspensionRecordId,
        priorRevocationRecordId: input.priorRevocationRecordId,
        authorityReference: input.authorityReference,
        correctiveEvidenceIds: input.correctiveEvidenceIds,
        inspectionVerified: input.inspectionVerified,
        professionalVerified: input.professionalVerified,
        effectiveAt: input.effectiveAt,
      },
    });

    await this.recordLifecycleEvent({
      officialInstrumentId: instrument.id,
      eventType: InstrumentLifecycleEventType.REINSTATED,
      controllingDecisionId: input.controllingDecisionId,
      priorStatus: instrument.lifecycleStatus,
      newStatus: InstrumentLifecycleStatus.REINSTATED,
      effectiveAt: input.effectiveAt,
      actorIdentityId: input.actorIdentityId,
    });

    return this.getInstrument(input.officialInstrumentId);
  }

  async expireInstrument(officialInstrumentId: string): Promise<OfficialInstrument> {
    const instrument = await this.getInstrument(officialInstrumentId);

    if (!instrument.effectiveUntil) {
      throw new BadRequestException('Instrument has no explicit effectiveUntil date');
    }

    if (instrument.effectiveUntil > new Date()) {
      throw new BadRequestException('Instrument has not yet reached expiration date');
    }

    await this.recordLifecycleEvent({
      officialInstrumentId,
      eventType: InstrumentLifecycleEventType.EXPIRED,
      priorStatus: instrument.lifecycleStatus,
      newStatus: InstrumentLifecycleStatus.EXPIRED,
      effectiveAt: instrument.effectiveUntil,
    });

    return this.getInstrument(officialInstrumentId);
  }

  async surrenderInstrument(input: SurrenderInstrumentInput): Promise<OfficialInstrument> {
    const instrument = await this.getInstrument(input.officialInstrumentId);

    if (input.controllingDecisionId) {
      await this.decisionService.assertDecisionFinalized(input.controllingDecisionId);
    }

    await this.prisma.instrumentSurrenderRecord.create({
      data: {
        officialInstrumentId: instrument.id,
        controllingDecisionId: input.controllingDecisionId,
        surrenderType: input.surrenderType,
        applicantRequestReference: input.applicantRequestReference,
        institutionalAcceptanceReference: input.institutionalAcceptanceReference,
        effectiveAt: input.effectiveAt,
        continuingObligations: this.asJson(input.continuingObligations ?? []),
        recordsRetentionReference: input.recordsRetentionReference,
        downstreamEffects: this.asJson(input.downstreamEffects ?? []),
      },
    });

    await this.recordLifecycleEvent({
      officialInstrumentId: instrument.id,
      eventType: InstrumentLifecycleEventType.SURRENDERED,
      controllingDecisionId: input.controllingDecisionId,
      priorStatus: instrument.lifecycleStatus,
      newStatus: InstrumentLifecycleStatus.SURRENDERED,
      effectiveAt: input.effectiveAt,
      actorIdentityId: input.actorIdentityId,
      metadata: { continuingObligations: input.continuingObligations ?? [] },
    });

    return this.getInstrument(input.officialInstrumentId);
  }

  async fileReviewReference(input: FileReviewReferenceInput) {
    const review = await this.prisma.decisionReviewReference.create({
      data: {
        challengedDecisionId: input.challengedDecisionId,
        challengedInstrumentId: input.challengedInstrumentId,
        reviewRoute: input.reviewRoute,
        reviewAuthority: input.reviewAuthority,
        filedAt: input.filedAt,
        deadline: input.deadline,
        appellantIdentityId: input.appellantIdentityId,
        appellantOfficeholderId: input.appellantOfficeholderId,
        groundsReference: input.groundsReference,
        interimEffect: ReviewInterimEffect.NONE,
        stayStatus: ReviewStayStatus.NONE,
      },
    });

    return review;
  }

  async authorizeStay(input: AuthorizeStayInput) {
    const review = await this.prisma.decisionReviewReference.findUnique({
      where: { id: input.reviewReferenceId },
    });

    if (!review) {
      throw new NotFoundException(`Review reference ${input.reviewReferenceId} not found`);
    }

    if (input.stayStatus !== ReviewStayStatus.INTERIM_STAY_AUTHORIZED) {
      throw new BadRequestException('Only explicitly authorized stays may be represented');
    }

    return this.prisma.decisionReviewReference.update({
      where: { id: input.reviewReferenceId },
      data: {
        interimEffect: input.interimEffect,
        stayStatus: input.stayStatus,
      },
    });
  }

  async recordLifecycleEvent(input: {
    officialInstrumentId: string;
    eventType: InstrumentLifecycleEventType;
    controllingDecisionId?: string;
    priorStatus?: InstrumentLifecycleStatus;
    newStatus: InstrumentLifecycleStatus;
    effectiveAt: Date;
    actorIdentityId?: string;
    actorOfficeholderId?: string;
    reason?: string;
    metadata?: Record<string, unknown>;
  }) {
    this.guard.assertConsequentialEventHasDecision(
      input.eventType,
      input.controllingDecisionId,
    );

    const event = await this.prisma.instrumentLifecycleEvent.create({
      data: {
        officialInstrumentId: input.officialInstrumentId,
        eventType: input.eventType,
        controllingDecisionId: input.controllingDecisionId,
        priorStatus: input.priorStatus,
        newStatus: input.newStatus,
        effectiveAt: input.effectiveAt,
        actorIdentityId: input.actorIdentityId,
        actorOfficeholderId: input.actorOfficeholderId,
        reason: input.reason,
        metadata: this.asJson(input.metadata ?? {}),
      },
    });

    if (input.controllingDecisionId) {
      await this.prisma.instrumentLifecycleDecisionLink.create({
        data: {
          lifecycleEventId: event.id,
          instrumentLifecycleDecisionId: input.controllingDecisionId,
          linkRole: 'CONTROLLING',
        },
      });
    }

    await this.verification.updateVerificationCache(input.officialInstrumentId, input.newStatus);

    return event;
  }

  private async getInstrument(officialInstrumentId: string) {
    const instrument = await this.prisma.officialInstrument.findUnique({
      where: { id: officialInstrumentId },
      include: {
        versions: { orderBy: { versionNumber: 'asc' } },
        lifecycleEvents: { orderBy: { effectiveAt: 'asc' } },
        currentVersion: true,
      },
    });

    if (!instrument) {
      throw new NotFoundException(`Instrument ${officialInstrumentId} not found`);
    }

    return instrument;
  }

  private async getInstrumentWithCurrentVersion(officialInstrumentId: string) {
    const instrument = await this.prisma.officialInstrument.findUnique({
      where: { id: officialInstrumentId },
      include: { currentVersion: true },
    });

    if (!instrument) {
      throw new NotFoundException(`Instrument ${officialInstrumentId} not found`);
    }

    if (!instrument.currentVersion) {
      throw new BadRequestException('Instrument has no current version');
    }

    return instrument;
  }

  private hashContent(reference: string): string {
    return createHash('sha256').update(reference).digest('hex');
  }

  private asJson(value: unknown): Prisma.InputJsonValue {
    return value as Prisma.InputJsonValue;
  }
}
