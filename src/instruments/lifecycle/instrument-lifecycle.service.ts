import { createHash, randomUUID } from 'node:crypto';

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  InstrumentJurisdictionScope,
  InstrumentLifecycleDecisionType,
  InstrumentLifecycleEventType,
  LifecycleInstrumentStatus,
  LifecycleOfficialInstrument,
  LifecycleOfficialInstrumentType,
  PriorVersionTreatment,
  Prisma,
  ReviewInterimEffect,
  ReviewStayStatus,
  SurrenderType,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { InstrumentLifecycleBoundaryService } from '../common/instrument-lifecycle-boundary.service';
import { InstrumentLifecycleDecisionService } from './instrument-lifecycle-decision.service';
import { InstrumentLifecycleGuardService } from './instrument-lifecycle-guard.service';
import { InstrumentVerificationService } from './instrument-verification.service';

export interface IssueInstrumentInput {
  instrumentNumber: string;
  instrumentType: LifecycleOfficialInstrumentType;
  jurisdictionScope?: InstrumentJurisdictionScope;
  issuingInstitutionId: string;
  originalLifecycleDecisionId: string;
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
  instrumentId: string;
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
  instrumentId: string;
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
  instrumentId: string;
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
  instrumentId: string;
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
  instrumentId: string;
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
  instrumentId: string;
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
  instrumentId: string;
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
  challengedLifecycleDecisionId: string;
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
    private readonly decisionService: InstrumentLifecycleDecisionService,
  ) {}

  async issueInstrument(input: IssueInstrumentInput): Promise<LifecycleOfficialInstrument> {
    await this.decisionService.assertDecisionFinalized(input.originalLifecycleDecisionId);

    const token = randomUUID();
    const contentHash = input.contentHash ?? this.hashContent(input.contentReference);

    const instrument = await this.prisma.lifecycleOfficialInstrument.create({
      data: {
        instrumentNumber: input.instrumentNumber,
        instrumentType: input.instrumentType,
        jurisdictionScope: input.jurisdictionScope ?? InstrumentJurisdictionScope.NATIONAL,
        lifecycleStatus: LifecycleInstrumentStatus.ISSUED,
        holderIdentityId: input.holderIdentityId,
        caseId: input.caseId,
        masterAdministrativeFileId: input.masterAdministrativeFileId,
        governmentServiceVersionId: input.governmentServiceVersionId,
        issuingInstitutionId: input.issuingInstitutionId,
        originalLifecycleDecisionId: input.originalLifecycleDecisionId,
        effectiveFrom: input.effectiveFrom,
        effectiveUntil: input.effectiveUntil,
        publicVerificationToken: token,
        publicVerificationStatus: 'VALID',
        versions: {
          create: {
            versionNumber: 1,
            isCurrent: true,
            contentReference: input.contentReference,
            contentHash,
            scopeDescription: input.scopeDescription,
            effectiveFrom: input.effectiveFrom,
            effectiveUntil: input.effectiveUntil,
            createdByDecisionId: input.originalLifecycleDecisionId,
          },
        },
      },
      include: { versions: true },
    });

    const version = instrument.versions[0];
    if (!version) {
      throw new BadRequestException('Issued instrument version was not created');
    }

    await this.prisma.lifecycleOfficialInstrument.update({
      where: { id: instrument.id },
      data: { currentVersionId: version.id },
    });

    await this.recordLifecycleEvent({
      instrumentId: instrument.id,
      eventType: InstrumentLifecycleEventType.ISSUED,
      controllingDecisionId: input.originalLifecycleDecisionId,
      newStatus: LifecycleInstrumentStatus.ISSUED,
      effectiveAt: input.effectiveFrom ?? new Date(),
      actorIdentityId: input.actorIdentityId,
      actorOfficeholderId: input.actorOfficeholderId,
    });

    return this.prisma.lifecycleOfficialInstrument.findUniqueOrThrow({
      where: { id: instrument.id },
      include: { versions: true, lifecycleEvents: true },
    });
  }

  async amendInstrument(input: AmendInstrumentInput): Promise<LifecycleOfficialInstrument> {
    await this.guard.assertNoConflictingPendingOperations(
      input.instrumentId,
      InstrumentLifecycleEventType.AMENDED,
    );

    const decision = await this.decisionService.assertDecisionFinalized(
      input.controllingDecisionId,
    );
    this.boundary.assertDecisionTypeMatchesLifecycleAction(decision.lifecycleDecisionType, [
      InstrumentLifecycleDecisionType.AMEND,
      InstrumentLifecycleDecisionType.APPROVE_WITH_CONDITIONS,
    ]);

    const instrument = await this.getInstrumentWithCurrentVersion(input.instrumentId);
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

    const newVersion = await this.prisma.lifecycleOfficialInstrumentVersion.create({
      data: {
        lifecycleInstrumentId: instrument.id,
        versionNumber: nextVersionNumber,
        isCurrent: true,
        contentReference: input.newContentReference,
        contentHash: newContentHash,
        scopeDescription: input.affectedScope,
        rightsAndObligations: this.asJson(input.affectedRights ?? []),
        conditions: this.asJson(input.affectedConditions ?? []),
        effectiveFrom: input.effectiveAt,
        priorVersionTreatment: input.priorVersionTreatment,
        createdByDecisionId: input.controllingDecisionId,
      },
    });

    await this.prisma.lifecycleOfficialInstrumentVersion.update({
      where: { id: priorVersion.id },
      data: {
        isCurrent: false,
        supersededByVersionId: newVersion.id,
      },
    });

    await this.prisma.instrumentAmendmentRecord.create({
      data: {
        lifecycleInstrumentId: instrument.id,
        priorVersionId: priorVersion.id,
        newVersionId: newVersion.id,
        controllingLifecycleDecisionId: input.controllingDecisionId,
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

    await this.prisma.lifecycleOfficialInstrument.update({
      where: { id: instrument.id },
      data: { currentVersionId: newVersion.id },
    });

    await this.recordLifecycleEvent({
      instrumentId: instrument.id,
      eventType: InstrumentLifecycleEventType.AMENDED,
      controllingDecisionId: input.controllingDecisionId,
      priorStatus: instrument.lifecycleStatus,
      newStatus: LifecycleInstrumentStatus.AMENDED,
      effectiveAt: input.effectiveAt,
      actorIdentityId: input.actorIdentityId,
      actorOfficeholderId: input.actorOfficeholderId,
    });

    return this.getInstrument(input.instrumentId);
  }

  async correctClerical(input: ClericalCorrectionInput): Promise<LifecycleOfficialInstrument> {
    this.boundary.assertClericalCorrectionScope(input);
    await this.decisionService.assertDecisionFinalized(input.controllingDecisionId);

    const instrument = await this.getInstrumentWithCurrentVersion(input.instrumentId);
    const priorVersion = instrument.currentVersion;
    if (!priorVersion) {
      throw new BadRequestException('Instrument has no current version for clerical correction');
    }

    const correctedHash =
      input.correctedContentHash ?? this.hashContent(input.correctedContentReference);

    const newVersion = await this.prisma.lifecycleOfficialInstrumentVersion.create({
      data: {
        lifecycleInstrumentId: instrument.id,
        versionNumber: priorVersion.versionNumber + 1,
        isCurrent: true,
        contentReference: input.correctedContentReference,
        contentHash: correctedHash,
        scopeDescription: priorVersion.scopeDescription,
        rightsAndObligations: this.asJson(priorVersion.rightsAndObligations),
        conditions: this.asJson(priorVersion.conditions),
        effectiveFrom: priorVersion.effectiveFrom,
        effectiveUntil: priorVersion.effectiveUntil,
        priorVersionTreatment: PriorVersionTreatment.RETAINED_HISTORICAL,
        createdByDecisionId: input.controllingDecisionId,
      },
    });

    await this.prisma.lifecycleOfficialInstrumentVersion.update({
      where: { id: priorVersion.id },
      data: { isCurrent: false, supersededByVersionId: newVersion.id },
    });

    await this.prisma.lifecycleOfficialInstrument.update({
      where: { id: instrument.id },
      data: { currentVersionId: newVersion.id },
    });

    await this.recordLifecycleEvent({
      instrumentId: instrument.id,
      eventType: InstrumentLifecycleEventType.CORRECTED_CLERICAL,
      controllingDecisionId: input.controllingDecisionId,
      priorStatus: instrument.lifecycleStatus,
      newStatus: instrument.lifecycleStatus,
      effectiveAt: new Date(),
      actorIdentityId: input.actorIdentityId,
    });

    return this.getInstrument(input.instrumentId);
  }

  async renewInstrument(input: RenewInstrumentInput): Promise<LifecycleOfficialInstrument> {
    await this.guard.assertNoConflictingPendingOperations(
      input.instrumentId,
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

    const instrument = await this.getInstrumentWithCurrentVersion(input.instrumentId);
    const priorVersion = instrument.currentVersion;
    if (!priorVersion) {
      throw new BadRequestException('Instrument has no current version for renewal');
    }

    const newContentHash = input.newContentHash ?? this.hashContent(input.newContentReference);

    const newVersion = await this.prisma.lifecycleOfficialInstrumentVersion.create({
      data: {
        lifecycleInstrumentId: instrument.id,
        versionNumber: priorVersion.versionNumber + 1,
        isCurrent: true,
        contentReference: input.newContentReference,
        contentHash: newContentHash,
        effectiveFrom: input.newEffectiveFrom,
        effectiveUntil: input.newEffectiveUntil,
        createdByDecisionId: input.controllingDecisionId,
      },
    });

    await this.prisma.lifecycleOfficialInstrumentVersion.update({
      where: { id: priorVersion.id },
      data: { isCurrent: false, supersededByVersionId: newVersion.id },
    });

    await this.prisma.instrumentRenewalRecord.create({
      data: {
        lifecycleInstrumentId: instrument.id,
        priorVersionId: priorVersion.id,
        newVersionId: newVersion.id,
        controllingLifecycleDecisionId: input.controllingDecisionId,
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

    await this.prisma.lifecycleOfficialInstrument.update({
      where: { id: instrument.id },
      data: {
        currentVersionId: newVersion.id,
        effectiveFrom: input.newEffectiveFrom,
        effectiveUntil: input.newEffectiveUntil,
      },
    });

    await this.recordLifecycleEvent({
      instrumentId: instrument.id,
      eventType: InstrumentLifecycleEventType.RENEWED,
      controllingDecisionId: input.controllingDecisionId,
      priorStatus: instrument.lifecycleStatus,
      newStatus: LifecycleInstrumentStatus.RENEWED,
      effectiveAt: input.newEffectiveFrom,
      actorIdentityId: input.actorIdentityId,
    });

    return this.getInstrument(input.instrumentId);
  }

  async suspendInstrument(input: SuspendInstrumentInput): Promise<LifecycleOfficialInstrument> {
    this.boundary.assertTechnicalAdminCannotCreateSuspensionDecision({
      actorRoleMarker: input.actorRoleMarker,
      isCreatingDecision: input.isCreatingDecision ?? false,
    });

    const eventType = input.isPartial
      ? InstrumentLifecycleEventType.PARTIALLY_SUSPENDED
      : InstrumentLifecycleEventType.SUSPENDED;
    const newStatus = input.isPartial
      ? LifecycleInstrumentStatus.PARTIALLY_SUSPENDED
      : LifecycleInstrumentStatus.SUSPENDED;

    await this.guard.assertNoConflictingPendingOperations(input.instrumentId, eventType);
    await this.decisionService.assertDecisionFinalized(input.controllingDecisionId);

    const instrument = await this.getInstrument(input.instrumentId);

    await this.prisma.instrumentSuspensionRecord.create({
      data: {
        lifecycleInstrumentId: instrument.id,
        controllingLifecycleDecisionId: input.controllingDecisionId,
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
      instrumentId: instrument.id,
      eventType,
      controllingDecisionId: input.controllingDecisionId,
      priorStatus: instrument.lifecycleStatus,
      newStatus,
      effectiveAt: input.effectiveAt,
      actorIdentityId: input.executedByIdentityId,
      metadata: input.partialScope ? { partialScope: input.partialScope } : {},
    });

    return this.getInstrument(input.instrumentId);
  }

  async revokeInstrument(input: RevokeInstrumentInput): Promise<LifecycleOfficialInstrument> {
    await this.guard.assertNoConflictingPendingOperations(
      input.instrumentId,
      InstrumentLifecycleEventType.REVOKED,
    );
    await this.decisionService.assertDecisionFinalized(input.controllingDecisionId);

    const instrument = await this.getInstrument(input.instrumentId);

    this.boundary.assertAbsezRevocationNotNational({
      jurisdictionScope: instrument.jurisdictionScope,
      representsNationalRevocation: input.representsNationalRevocation ?? true,
    });

    await this.prisma.instrumentRevocationRecord.create({
      data: {
        lifecycleInstrumentId: instrument.id,
        controllingLifecycleDecisionId: input.controllingDecisionId,
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
      instrumentId: instrument.id,
      eventType: InstrumentLifecycleEventType.REVOKED,
      controllingDecisionId: input.controllingDecisionId,
      priorStatus: instrument.lifecycleStatus,
      newStatus: LifecycleInstrumentStatus.REVOKED,
      effectiveAt: input.effectiveAt,
      actorIdentityId: input.actorIdentityId,
    });

    return this.getInstrument(input.instrumentId);
  }

  async reinstateInstrument(input: ReinstateInstrumentInput): Promise<LifecycleOfficialInstrument> {
    await this.guard.assertNoConflictingPendingOperations(
      input.instrumentId,
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

    const instrument = await this.getInstrument(input.instrumentId);

    await this.prisma.instrumentReinstatementRecord.create({
      data: {
        lifecycleInstrumentId: instrument.id,
        controllingLifecycleDecisionId: input.controllingDecisionId,
        priorSuspensionRecordId: input.priorSuspensionRecordId,
        priorRevocationRecordId: input.priorRevocationRecordId,
        authorityReference: input.authorityReference,
        correctiveEvidenceIds: input.correctiveEvidenceIds,
        inspectionVerified: input.inspectionVerified,
        professionalVerified: input.professionalVerified,
        effectiveAt: input.effectiveAt,
        continuingConditions: this.asJson(input.continuingConditions ?? []),
      },
    });

    await this.recordLifecycleEvent({
      instrumentId: instrument.id,
      eventType: InstrumentLifecycleEventType.REINSTATED,
      controllingDecisionId: input.controllingDecisionId,
      priorStatus: instrument.lifecycleStatus,
      newStatus: LifecycleInstrumentStatus.REINSTATED,
      effectiveAt: input.effectiveAt,
      actorIdentityId: input.actorIdentityId,
    });

    return this.getInstrument(input.instrumentId);
  }

  async expireInstrument(instrumentId: string): Promise<LifecycleOfficialInstrument> {
    const instrument = await this.getInstrument(instrumentId);

    if (!instrument.effectiveUntil) {
      throw new BadRequestException('Instrument has no explicit effectiveUntil date');
    }

    if (instrument.effectiveUntil > new Date()) {
      throw new BadRequestException('Instrument has not yet reached expiration date');
    }

    await this.recordLifecycleEvent({
      instrumentId,
      eventType: InstrumentLifecycleEventType.EXPIRED,
      priorStatus: instrument.lifecycleStatus,
      newStatus: LifecycleInstrumentStatus.EXPIRED,
      effectiveAt: instrument.effectiveUntil,
    });

    return this.getInstrument(instrumentId);
  }

  async surrenderInstrument(input: SurrenderInstrumentInput): Promise<LifecycleOfficialInstrument> {
    const instrument = await this.getInstrument(input.instrumentId);

    if (input.controllingDecisionId) {
      await this.decisionService.assertDecisionFinalized(input.controllingDecisionId);
    }

    await this.prisma.instrumentSurrenderRecord.create({
      data: {
        lifecycleInstrumentId: instrument.id,
        controllingLifecycleDecisionId: input.controllingDecisionId,
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
      instrumentId: instrument.id,
      eventType: InstrumentLifecycleEventType.SURRENDERED,
      controllingDecisionId: input.controllingDecisionId,
      priorStatus: instrument.lifecycleStatus,
      newStatus: LifecycleInstrumentStatus.SURRENDERED,
      effectiveAt: input.effectiveAt,
      actorIdentityId: input.actorIdentityId,
      metadata: { continuingObligations: input.continuingObligations ?? [] },
    });

    return this.getInstrument(input.instrumentId);
  }

  async fileReviewReference(input: FileReviewReferenceInput) {
    const review = await this.prisma.decisionReviewReference.create({
      data: {
        challengedLifecycleDecisionId: input.challengedLifecycleDecisionId,
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
    instrumentId: string;
    eventType: InstrumentLifecycleEventType;
    controllingDecisionId?: string;
    priorStatus?: LifecycleInstrumentStatus;
    newStatus: LifecycleInstrumentStatus;
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
        lifecycleInstrumentId: input.instrumentId,
        eventType: input.eventType,
        controllingLifecycleDecisionId: input.controllingDecisionId,
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

    await this.verification.updateVerificationCache(input.instrumentId, input.newStatus);

    return event;
  }

  private async getInstrument(instrumentId: string) {
    const instrument = await this.prisma.lifecycleOfficialInstrument.findUnique({
      where: { id: instrumentId },
      include: {
        versions: { orderBy: { versionNumber: 'asc' } },
        lifecycleEvents: { orderBy: { effectiveAt: 'asc' } },
        currentVersion: true,
      },
    });

    if (!instrument) {
      throw new NotFoundException(`Instrument ${instrumentId} not found`);
    }

    return instrument;
  }

  private async getInstrumentWithCurrentVersion(instrumentId: string) {
    const instrument = await this.prisma.lifecycleOfficialInstrument.findUnique({
      where: { id: instrumentId },
      include: { currentVersion: true },
    });

    if (!instrument) {
      throw new NotFoundException(`Instrument ${instrumentId} not found`);
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
