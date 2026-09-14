import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AuthorityBoundaryAssessment,
  CompetencyAssessmentOutcome,
  ContinuityCompetencyAssessment,
  OperatorCompetencyAssessment,
  PracticalAssessment,
  SecurityPrivacyAssessment,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ProductionReadinessBoundaryService } from '../common/production-readiness-boundary.service';

export interface RecordCompetencyAssessmentInput {
  operatorReadinessProfileId: string;
  operatorQualificationId?: string;
  assessorIdentityId: string;
  assessorOfficeholderId?: string;
  assessmentType: string;
  score?: number;
  passingScore?: number;
  outcome: CompetencyAssessmentOutcome;
  evidenceReference?: string;
  isAttendanceOnly?: boolean;
  isAiAssessed?: boolean;
  expiresAt?: Date;
}

@Injectable()
export class OperatorCompetencyAssessmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ProductionReadinessBoundaryService,
  ) {}

  async recordAssessment(
    input: RecordCompetencyAssessmentInput,
  ): Promise<OperatorCompetencyAssessment> {
    this.boundary.assertAiCannotQualifyOperator(input.isAiAssessed ?? false);
    this.boundary.assertAttendanceNotCompetence(input.isAttendanceOnly ?? false);

    const assessor = await this.prisma.identity.findUnique({
      where: { id: input.assessorIdentityId },
    });

    if (!assessor) {
      throw new NotFoundException(`Assessor identity ${input.assessorIdentityId} not found`);
    }

    this.boundary.assertAiIdentityCannotQualify(assessor.displayName);

    return this.prisma.operatorCompetencyAssessment.create({
      data: {
        operatorReadinessProfileId: input.operatorReadinessProfileId,
        operatorQualificationId: input.operatorQualificationId,
        assessorIdentityId: input.assessorIdentityId,
        assessorOfficeholderId: input.assessorOfficeholderId,
        assessmentType: input.assessmentType,
        score: input.score,
        passingScore: input.passingScore,
        outcome: input.isAttendanceOnly ? CompetencyAssessmentOutcome.PENDING : input.outcome,
        evidenceReference: input.evidenceReference,
        isAttendanceOnly: input.isAttendanceOnly ?? false,
        isAiAssessed: false,
        expiresAt: input.expiresAt,
      },
    });
  }

  async recordPracticalAssessment(
    input: Omit<RecordCompetencyAssessmentInput, 'assessmentType' | 'isAttendanceOnly'> & {
      practicalEvidenceReference?: string;
      notes?: string;
    },
  ): Promise<PracticalAssessment> {
    if (!input.operatorQualificationId) {
      throw new NotFoundException('operatorQualificationId is required for practical assessment');
    }

    this.boundary.assertAiCannotQualifyOperator(input.isAiAssessed ?? false);

    return this.prisma.practicalAssessment.create({
      data: {
        operatorQualificationId: input.operatorQualificationId,
        assessorIdentityId: input.assessorIdentityId,
        assessorOfficeholderId: input.assessorOfficeholderId,
        outcome: input.outcome,
        practicalEvidenceReference: input.practicalEvidenceReference,
        notes: input.notes,
        isAiAssessed: false,
        expiresAt: input.expiresAt,
      },
    });
  }

  async recordAuthorityBoundaryAssessment(
    input: Omit<RecordCompetencyAssessmentInput, 'assessmentType' | 'isAttendanceOnly'> & {
      boundaryScopeVerified?: boolean;
      delegationScopeVerified?: boolean;
      notes?: string;
    },
  ): Promise<AuthorityBoundaryAssessment> {
    if (!input.operatorQualificationId) {
      throw new NotFoundException(
        'operatorQualificationId is required for authority-boundary assessment',
      );
    }

    this.boundary.assertAiCannotQualifyOperator(input.isAiAssessed ?? false);

    return this.prisma.authorityBoundaryAssessment.create({
      data: {
        operatorQualificationId: input.operatorQualificationId,
        assessorIdentityId: input.assessorIdentityId,
        assessorOfficeholderId: input.assessorOfficeholderId,
        outcome: input.outcome,
        boundaryScopeVerified: input.boundaryScopeVerified ?? false,
        delegationScopeVerified: input.delegationScopeVerified ?? false,
        notes: input.notes,
        isAiAssessed: false,
        expiresAt: input.expiresAt,
      },
    });
  }

  async recordSecurityPrivacyAssessment(
    input: Omit<RecordCompetencyAssessmentInput, 'assessmentType' | 'isAttendanceOnly'> & {
      securityCleared?: boolean;
      privacyCleared?: boolean;
      notes?: string;
    },
  ): Promise<SecurityPrivacyAssessment> {
    if (!input.operatorQualificationId) {
      throw new NotFoundException(
        'operatorQualificationId is required for security/privacy assessment',
      );
    }

    this.boundary.assertAiCannotQualifyOperator(input.isAiAssessed ?? false);

    return this.prisma.securityPrivacyAssessment.create({
      data: {
        operatorQualificationId: input.operatorQualificationId,
        assessorIdentityId: input.assessorIdentityId,
        assessorOfficeholderId: input.assessorOfficeholderId,
        outcome: input.outcome,
        securityCleared: input.securityCleared ?? false,
        privacyCleared: input.privacyCleared ?? false,
        notes: input.notes,
        isAiAssessed: false,
        expiresAt: input.expiresAt,
      },
    });
  }

  async recordContinuityAssessment(
    input: Omit<RecordCompetencyAssessmentInput, 'assessmentType' | 'isAttendanceOnly'> & {
      continuityPlanVerified?: boolean;
      notes?: string;
    },
  ): Promise<ContinuityCompetencyAssessment> {
    if (!input.operatorQualificationId) {
      throw new NotFoundException(
        'operatorQualificationId is required for continuity assessment',
      );
    }

    this.boundary.assertAiCannotQualifyOperator(input.isAiAssessed ?? false);

    return this.prisma.continuityCompetencyAssessment.create({
      data: {
        operatorQualificationId: input.operatorQualificationId,
        assessorIdentityId: input.assessorIdentityId,
        assessorOfficeholderId: input.assessorOfficeholderId,
        outcome: input.outcome,
        continuityPlanVerified: input.continuityPlanVerified ?? false,
        notes: input.notes,
        isAiAssessed: false,
        expiresAt: input.expiresAt,
      },
    });
  }
}
