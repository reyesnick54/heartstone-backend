import { BadRequestException, Injectable } from '@nestjs/common';
import {
  AnalysisSourceStatus,
  IntelligenceAlertStatus,
  IntelligenceMonitoringFrequency,
  IntelligenceMonitoringObjectType,
  IntelligenceMonitoringRuleStatus,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { IntelligenceBoundaryService } from '../common/intelligence-boundary.service';
import {
  INTELLIGENCE_ALERT_DISCLAIMER,
  INTELLIGENCE_ALERT_NUMBER_PREFIX,
} from '../intelligence.constants';

export interface CreateMonitoringRuleInput {
  code: string;
  name: string;
  objectType: IntelligenceMonitoringObjectType;
  objectReference: string;
  approvedSourceReference: string;
  approvedSourceLabel: string;
  conditionDescription: string;
  detectionRule: Prisma.InputJsonValue;
  thresholdConfig: Prisma.InputJsonValue;
  ownerIdentityId: string;
  purpose: string;
  reviewerIdentityId: string;
  frequency: IntelligenceMonitoringFrequency;
  effectiveFrom: Date;
  effectiveUntil?: Date;
  institutionId?: string;
  lawfulBasis?: string;
  accessApprovalRef?: string;
  forbiddenSubjectType?: string;
  proportionateSafeguards?: string;
}

export interface RecordObservationInput {
  ruleId: string;
  observedCondition: string;
  sourceReference: string;
  sourceStatus: AnalysisSourceStatus;
  confidenceNotes?: string;
  uncertaintyNotes?: string;
  isStaleSource?: boolean;
}

export interface GenerateAlertInput {
  ruleId: string;
  observationId?: string;
  observedCondition: string;
  sourceReference: string;
  observedAt: Date;
  confidenceNotes?: string;
  uncertaintyNotes?: string;
  affectedServiceIds?: Prisma.InputJsonValue;
  recommendedReview: string;
  responsibleRecipientIdentityId: string;
}

export interface VerifyAlertInput {
  alertId: string;
  verifierIdentityId: string;
  evidenceRefs: Prisma.InputJsonValue;
  verificationNotes: string;
  actorRoleMarker?: string;
  isAlgorithmic?: boolean;
  isConsequential?: boolean;
}

export interface DisposeAlertInput {
  alertId: string;
  dispositionStatus: IntelligenceAlertStatus;
  disposedByIdentityId: string;
  dispositionNotes?: string;
  actorRoleMarker?: string;
}

@Injectable()
export class IntelligenceMonitoringService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: IntelligenceBoundaryService,
  ) {}

  async findRuleById(ruleId: string) {
    const rule = await this.prisma.intelligenceMonitoringRule.findUnique({
      where: { id: ruleId },
    });
    if (!rule) {
      throw new BadRequestException('Monitoring rule not found');
    }
    return rule;
  }

  async findAlertById(alertId: string) {
    const alert = await this.prisma.intelligenceMonitoringAlert.findUnique({
      where: { id: alertId },
    });
    if (!alert) {
      throw new BadRequestException('Alert not found');
    }
    return alert;
  }

  async createRule(input: CreateMonitoringRuleInput) {
    this.boundary.assertMonitoringPrivacyAuthorized({
      subjectType: input.forbiddenSubjectType,
      institutionalPurpose: input.purpose,
      lawfulBasis: input.lawfulBasis,
      accessApprovalRef: input.accessApprovalRef,
      proportionateSafeguards: input.proportionateSafeguards,
    });

    this.assertDetectionRuleStructured(input.detectionRule);

    return this.prisma.intelligenceMonitoringRule.create({
      data: {
        code: input.code,
        name: input.name,
        objectType: input.objectType,
        objectReference: input.objectReference,
        approvedSourceReference: input.approvedSourceReference,
        approvedSourceLabel: input.approvedSourceLabel,
        conditionDescription: input.conditionDescription,
        detectionRule: input.detectionRule,
        thresholdConfig: input.thresholdConfig,
        ownerIdentityId: input.ownerIdentityId,
        purpose: input.purpose,
        reviewerIdentityId: input.reviewerIdentityId,
        frequency: input.frequency,
        effectiveFrom: input.effectiveFrom,
        effectiveUntil: input.effectiveUntil,
        institutionId: input.institutionId,
        lawfulBasis: input.lawfulBasis,
        accessApprovalRef: input.accessApprovalRef,
        status: IntelligenceMonitoringRuleStatus.DRAFT,
      },
    });
  }

  async activateRule(ruleId: string) {
    const rule = await this.prisma.intelligenceMonitoringRule.findUnique({
      where: { id: ruleId },
    });
    if (!rule?.approvedSourceReference) {
      throw new BadRequestException(
        'Monitoring rule requires an approved source before activation',
      );
    }

    return this.prisma.intelligenceMonitoringRule.update({
      where: { id: ruleId },
      data: { status: IntelligenceMonitoringRuleStatus.ACTIVE },
    });
  }

  async recordObservation(input: RecordObservationInput) {
    const rule = await this.prisma.intelligenceMonitoringRule.findUnique({
      where: { id: input.ruleId },
    });
    if (rule?.status !== IntelligenceMonitoringRuleStatus.ACTIVE) {
      throw new BadRequestException('Monitoring rule is not active');
    }

    this.boundary.assertMonitoringSourceApproved({
      observationSourceReference: input.sourceReference,
      approvedSourceReference: rule.approvedSourceReference,
    });

    return this.prisma.intelligenceMonitoringObservation.create({
      data: {
        ruleId: input.ruleId,
        observedCondition: input.observedCondition,
        sourceReference: input.sourceReference,
        sourceStatus: input.sourceStatus,
        confidenceNotes: input.confidenceNotes,
        uncertaintyNotes: input.uncertaintyNotes,
        isStaleSource: input.isStaleSource ?? input.sourceStatus === AnalysisSourceStatus.STALE,
      },
    });
  }

  async generateAlert(input: GenerateAlertInput) {
    const rule = await this.prisma.intelligenceMonitoringRule.findUnique({
      where: { id: input.ruleId },
    });
    if (rule?.status !== IntelligenceMonitoringRuleStatus.ACTIVE) {
      throw new BadRequestException('Monitoring rule is not active');
    }

    this.boundary.assertMonitoringSourceApproved({
      observationSourceReference: input.sourceReference,
      approvedSourceReference: rule.approvedSourceReference,
    });

    this.boundary.assertAlertNotViolationOrEmergency({
      isViolation: false,
      isEmergency: false,
      isEnforcement: false,
    });

    const count = await this.prisma.intelligenceMonitoringAlert.count();
    const alertNumber = `${INTELLIGENCE_ALERT_NUMBER_PREFIX}-${String(count + 1).padStart(8, '0')}`;

    const staleNote = input.uncertaintyNotes?.includes('stale')
      ? input.uncertaintyNotes
      : `${input.uncertaintyNotes ?? ''} ${INTELLIGENCE_ALERT_DISCLAIMER}`.trim();

    return this.prisma.intelligenceMonitoringAlert.create({
      data: {
        alertNumber,
        ruleId: input.ruleId,
        observationId: input.observationId,
        monitoredObjectType: rule.objectType,
        monitoredObjectReference: rule.objectReference,
        sourceReference: input.sourceReference,
        observedCondition: input.observedCondition,
        observedAt: input.observedAt,
        confidenceNotes: input.confidenceNotes,
        uncertaintyNotes: staleNote,
        affectedServiceIds: input.affectedServiceIds ?? [],
        recommendedReview: input.recommendedReview,
        responsibleRecipientIdentityId: input.responsibleRecipientIdentityId,
        status: IntelligenceAlertStatus.GENERATED,
        isViolation: false,
        isEmergency: false,
        isEnforcement: false,
      },
    });
  }

  async verifyAlert(input: VerifyAlertInput) {
    this.boundary.assertAiCannotSelfVerify({
      actorRoleMarker: input.actorRoleMarker,
      verifierIdentityId: input.verifierIdentityId,
      isAlgorithmic: input.isAlgorithmic,
    });
    this.boundary.assertVerificationRequiredForConsequential(
      input.isConsequential ?? true,
      input.verifierIdentityId,
    );

    const alert = await this.prisma.intelligenceMonitoringAlert.findUnique({
      where: { id: input.alertId },
    });
    if (!alert) {
      throw new BadRequestException('Alert not found');
    }

    const verification = await this.prisma.intelligenceAlertVerification.create({
      data: {
        alertId: input.alertId,
        verifierIdentityId: input.verifierIdentityId,
        evidenceRefs: input.evidenceRefs,
        verificationNotes: input.verificationNotes,
        isAlgorithmic: false,
      },
    });

    await this.prisma.intelligenceMonitoringAlert.update({
      where: { id: input.alertId },
      data: { status: IntelligenceAlertStatus.UNDER_REVIEW },
    });

    return verification;
  }

  async disposeAlert(input: DisposeAlertInput) {
    this.boundary.assertAiCannotImposeEnforcement(input.actorRoleMarker);
    this.boundary.assertHumanReviewerPresent(input.disposedByIdentityId);

    if (input.dispositionStatus === IntelligenceAlertStatus.VERIFIED_EVENT) {
      const existingVerification = await this.prisma.intelligenceAlertVerification.count({
        where: { alertId: input.alertId },
      });
      if (existingVerification === 0) {
        throw new BadRequestException(
          'Verified event disposition requires prior human verification with evidence',
        );
      }
    }

    const disposition = await this.prisma.intelligenceAlertDisposition.create({
      data: {
        alertId: input.alertId,
        dispositionStatus: input.dispositionStatus,
        disposedByIdentityId: input.disposedByIdentityId,
        dispositionNotes: input.dispositionNotes,
      },
    });

    await this.prisma.intelligenceMonitoringAlert.update({
      where: { id: input.alertId },
      data: { status: input.dispositionStatus },
    });

    return disposition;
  }

  private assertDetectionRuleStructured(config: Prisma.JsonValue | Prisma.InputJsonValue) {
    if (typeof config !== 'object' || config === null || Array.isArray(config)) {
      throw new BadRequestException('Detection rule requires structured JSON configuration');
    }

    const record = config as Record<string, unknown>;
    if ('expression' in record || 'executable' in record || 'script' in record) {
      throw new BadRequestException('Arbitrary executable detection expressions are not permitted');
    }
  }
}
