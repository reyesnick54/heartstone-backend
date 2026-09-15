import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  DepartmentReadinessAssessment,
  DepartmentReadinessStatus,
  StaffingReadinessAssessment,
  StaffingReadinessStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ProductionReadinessBoundaryService } from '../common/production-readiness-boundary.service';
import { SupportCoverageService } from '../support/support-coverage.service';

export interface AssessDepartmentReadinessInput {
  assessmentNumber: string;
  departmentId: string;
  assessorIdentityId: string;
  assessorOfficeholderId?: string;
  mandateAssessed?: boolean;
  headAssessed?: boolean;
  officeholdersAssessed?: boolean;
  staffingAssessed?: boolean;
  qualificationsAssessed?: boolean;
  proceduresAssessed?: boolean;
  recordsAssessed?: boolean;
  technologyAssessed?: boolean;
  securityAssessed?: boolean;
  trainingAssessed?: boolean;
  dependenciesAssessed?: boolean;
  supportAssessed?: boolean;
  continuityAssessed?: boolean;
  testsAssessed?: boolean;
  acceptanceAssessed?: boolean;
  activationAuthorityAssessed?: boolean;
  conditions?: string;
  supportCoveragePlanId?: string;
  selfActivated?: boolean;
  isInstitutionalAcceptance?: boolean;
}

export interface AssessStaffingReadinessInput {
  departmentReadinessAssessmentId: string;
  departmentId: string;
  assessorIdentityId: string;
  assessorOfficeholderId?: string;
  requiredPositions: number;
  filledPositions: number;
  qualifiedPositions: number;
  mandatoryControlOperable: boolean;
  notes?: string;
}

@Injectable()
export class DepartmentReadinessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ProductionReadinessBoundaryService,
    private readonly supportCoverageService: SupportCoverageService,
  ) {}

  async assessDepartment(
    input: AssessDepartmentReadinessInput,
  ): Promise<DepartmentReadinessAssessment> {
    this.boundary.rejectClientReadinessFields(input as unknown as Record<string, unknown>);
    this.boundary.assertDepartmentCannotSelfActivate(input.selfActivated ?? false);
    this.boundary.assertDepartmentReadinessNotInstitutionalAcceptance(
      input.isInstitutionalAcceptance ?? false,
    );

    let supportCoverageGapDetected = false;
    if (input.supportCoveragePlanId) {
      supportCoverageGapDetected = await this.supportCoverageService.detectCoverageGap(
        input.supportCoveragePlanId,
      );
    }

    const allDimensionsAssessed = [
      input.mandateAssessed,
      input.headAssessed,
      input.officeholdersAssessed,
      input.staffingAssessed,
      input.qualificationsAssessed,
      input.proceduresAssessed,
      input.recordsAssessed,
      input.technologyAssessed,
      input.securityAssessed,
      input.trainingAssessed,
      input.dependenciesAssessed,
      input.supportAssessed,
      input.continuityAssessed,
      input.testsAssessed,
      input.acceptanceAssessed,
      input.activationAuthorityAssessed,
    ].every(Boolean);

    let status: DepartmentReadinessStatus = DepartmentReadinessStatus.NOT_READY;
    if (allDimensionsAssessed && !supportCoverageGapDetected) {
      status = DepartmentReadinessStatus.READY_WITH_CONDITIONS;
    } else if (allDimensionsAssessed) {
      status = DepartmentReadinessStatus.PARTIALLY_READY;
    }

    status = this.boundary.deriveReadinessStatusFromGaps({
      status,
      isInstitutionalAcceptance: false,
      selfActivated: false,
      supportCoverageGapDetected,
      staffingShortageDetected: false,
      mandatoryControlOperable: true,
    });

    return this.prisma.departmentReadinessAssessment.create({
      data: {
        assessmentNumber: input.assessmentNumber,
        departmentId: input.departmentId,
        assessorIdentityId: input.assessorIdentityId,
        assessorOfficeholderId: input.assessorOfficeholderId,
        status,
        mandateAssessed: input.mandateAssessed ?? false,
        headAssessed: input.headAssessed ?? false,
        officeholdersAssessed: input.officeholdersAssessed ?? false,
        staffingAssessed: input.staffingAssessed ?? false,
        qualificationsAssessed: input.qualificationsAssessed ?? false,
        proceduresAssessed: input.proceduresAssessed ?? false,
        recordsAssessed: input.recordsAssessed ?? false,
        technologyAssessed: input.technologyAssessed ?? false,
        securityAssessed: input.securityAssessed ?? false,
        trainingAssessed: input.trainingAssessed ?? false,
        dependenciesAssessed: input.dependenciesAssessed ?? false,
        supportAssessed: input.supportAssessed ?? false,
        continuityAssessed: input.continuityAssessed ?? false,
        testsAssessed: input.testsAssessed ?? false,
        acceptanceAssessed: input.acceptanceAssessed ?? false,
        activationAuthorityAssessed: input.activationAuthorityAssessed ?? false,
        conditions: input.conditions,
        supportCoverageGapDetected,
        staffingShortageDetected: false,
        isInstitutionalAcceptance: false,
        selfActivated: false,
      },
    });
  }

  async assessStaffing(input: AssessStaffingReadinessInput): Promise<StaffingReadinessAssessment> {
    const departmentAssessment = await this.prisma.departmentReadinessAssessment.findUnique({
      where: { id: input.departmentReadinessAssessmentId },
    });

    if (!departmentAssessment) {
      throw new NotFoundException(
        `DepartmentReadinessAssessment ${input.departmentReadinessAssessmentId} not found`,
      );
    }

    const shortageBlocksReadiness =
      input.filledPositions < input.requiredPositions ||
      input.qualifiedPositions < input.requiredPositions;

    this.boundary.assertStaffingShortageBlocksReadiness(
      shortageBlocksReadiness,
      input.mandatoryControlOperable,
    );

    let status: StaffingReadinessStatus = StaffingReadinessStatus.READY;
    if (shortageBlocksReadiness && !input.mandatoryControlOperable) {
      status = StaffingReadinessStatus.NOT_READY;
    } else if (shortageBlocksReadiness) {
      status = StaffingReadinessStatus.PARTIALLY_READY;
    } else if (input.qualifiedPositions < input.filledPositions) {
      status = StaffingReadinessStatus.READY_WITH_CONDITIONS;
    }

    const staffingAssessment = await this.prisma.staffingReadinessAssessment.create({
      data: {
        departmentReadinessAssessmentId: input.departmentReadinessAssessmentId,
        departmentId: input.departmentId,
        assessorIdentityId: input.assessorIdentityId,
        assessorOfficeholderId: input.assessorOfficeholderId,
        status,
        requiredPositions: input.requiredPositions,
        filledPositions: input.filledPositions,
        qualifiedPositions: input.qualifiedPositions,
        mandatoryControlOperable: input.mandatoryControlOperable,
        shortageBlocksReadiness,
        notes: input.notes,
      },
    });

    if (shortageBlocksReadiness && !input.mandatoryControlOperable) {
      await this.prisma.departmentReadinessAssessment.update({
        where: { id: departmentAssessment.id },
        data: {
          staffingShortageDetected: true,
          status: DepartmentReadinessStatus.NOT_READY,
        },
      });
    }

    return staffingAssessment;
  }

  async findById(id: string): Promise<DepartmentReadinessAssessment> {
    const assessment = await this.prisma.departmentReadinessAssessment.findUnique({
      where: { id },
      include: { staffingAssessments: true },
    });

    if (!assessment) {
      throw new NotFoundException(`DepartmentReadinessAssessment ${id} not found`);
    }

    return assessment;
  }

  assertNotInstitutionalAcceptance(assessment: DepartmentReadinessAssessment): void {
    if (assessment.isInstitutionalAcceptance) {
      throw new BadRequestException(
        'Department readiness assessment does not equal institutional acceptance',
      );
    }
  }
}
