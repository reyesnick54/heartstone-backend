import { Injectable, NotFoundException } from '@nestjs/common';
import {
  IdentityType,
  TaxAssessmentStatus,
  TaxCalculationSourceKind,
  TaxLiabilityStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { RevenueBoundaryService } from '../common/revenue-boundary.service';
import { TAX_ASSESSMENT_REFERENCE_PREFIX } from '../revenue.constants';

export interface IssueTaxAssessmentInput {
  taxpayerAccountId: string;
  taxTypeDefinitionId: string;
  taxPeriodId: string;
  taxReturnId?: string;
  calculationRecordId: string;
  issuedByOfficeholderId: string;
  actorIdentityType: IdentityType;
  lines: {
    lineCode: string;
    description: string;
    amountCents: number;
    currency?: string;
  }[];
  clientPayload?: Record<string, unknown>;
  actorRoleMarker?: string;
}

@Injectable()
export class TaxAssessmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: RevenueBoundaryService,
  ) {}

  async issueAssessment(input: IssueTaxAssessmentInput) {
    if (input.clientPayload) {
      this.boundary.rejectClientTaxAssessmentFields(input.clientPayload);
    }
    this.boundary.assertPlatformAdminCannotAlterLiability(input.actorRoleMarker);
    this.boundary.assertAiCannotIssueAssessment(
      input.actorIdentityType,
      TaxCalculationSourceKind.REVENUE_OFFICER,
    );

    const calculation = await this.prisma.taxCalculationRecord.findUnique({
      where: { id: input.calculationRecordId },
    });
    if (!calculation) {
      throw new NotFoundException(`TaxCalculationRecord ${input.calculationRecordId} not found`);
    }

    const count = await this.prisma.taxAssessment.count();
    const assessmentReference = `${TAX_ASSESSMENT_REFERENCE_PREFIX}-${String(count + 1).padStart(8, '0')}`;

    const assessment = await this.prisma.taxAssessment.create({
      data: {
        taxpayerAccountId: input.taxpayerAccountId,
        taxTypeDefinitionId: input.taxTypeDefinitionId,
        taxPeriodId: input.taxPeriodId,
        taxReturnId: input.taxReturnId,
        assessmentReference,
        status: TaxAssessmentStatus.ISSUED,
        issuedByOfficeholderId: input.issuedByOfficeholderId,
        issuedAt: new Date(),
        calculationRecordId: input.calculationRecordId,
        lines: {
          create: input.lines.map((line, index) => ({
            lineCode: line.lineCode,
            description: line.description,
            amountCents: line.amountCents,
            currency: line.currency ?? 'XCD',
            sortOrder: index,
          })),
        },
      },
      include: { lines: true },
    });

    const principalCents = input.lines.reduce((sum, line) => sum + line.amountCents, 0);
    const liability = await this.prisma.taxLiability.create({
      data: {
        taxpayerAccountId: input.taxpayerAccountId,
        taxAssessmentId: assessment.id,
        liabilityReference: `${assessmentReference}-LIAB`,
        status: TaxLiabilityStatus.OPEN,
        principalCents,
        currency: input.lines[0]?.currency ?? 'XCD',
      },
    });

    return { assessment, liability };
  }

  async amendAssessment(input: IssueTaxAssessmentInput & { supersedesAssessmentId: string }) {
    const prior = await this.prisma.taxAssessment.findUnique({
      where: { id: input.supersedesAssessmentId },
    });
    if (!prior) {
      throw new NotFoundException(`TaxAssessment ${input.supersedesAssessmentId} not found`);
    }

    const issued = await this.issueAssessment(input);
    await this.prisma.taxAssessment.update({
      where: { id: prior.id },
      data: { status: TaxAssessmentStatus.SUPERSEDED },
    });
    await this.prisma.taxAssessment.update({
      where: { id: issued.assessment.id },
      data: {
        status: TaxAssessmentStatus.AMENDED,
        supersedesAssessmentId: prior.id,
      },
    });

    return issued;
  }

  rejectClientLiabilityMutation(payload: Record<string, unknown>, actorRoleMarker?: string) {
    this.boundary.assertPlatformAdminCannotAlterLiability(actorRoleMarker);
    this.boundary.rejectClientTaxLiabilityFields(payload);
  }

  assertCalculationMetadataStored(calculationRecord: { ruleConfigurationVersion: number }) {
    this.boundary.assertCalculationRecordsRuleVersion(calculationRecord.ruleConfigurationVersion);
  }
}
