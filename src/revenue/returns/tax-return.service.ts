import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TaxReturnStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { RevenueBoundaryService } from '../common/revenue-boundary.service';
import { hashTaxReturnPayload } from '../common/tax-return-hash.util';
import { REVENUE_BOUNDARY_DISCLAIMER, TAX_RETURN_REFERENCE_PREFIX } from '../revenue.constants';

export interface FileTaxReturnVersionInput {
  taxReturnId: string;
  declarationData: Record<string, unknown>;
  submittedByIdentityId: string;
  isAmendment?: boolean;
}

@Injectable()
export class TaxReturnService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: RevenueBoundaryService,
  ) {}

  async createReturnShell(input: {
    taxpayerAccountId: string;
    taxTypeDefinitionId: string;
    taxPeriodId: string;
  }) {
    const count = await this.prisma.taxReturn.count();
    const returnReference = `${TAX_RETURN_REFERENCE_PREFIX}-${String(count + 1).padStart(8, '0')}`;

    return this.prisma.taxReturn.create({
      data: {
        taxpayerAccountId: input.taxpayerAccountId,
        taxTypeDefinitionId: input.taxTypeDefinitionId,
        taxPeriodId: input.taxPeriodId,
        returnReference,
        status: TaxReturnStatus.DRAFT,
      },
    });
  }

  async submitVersion(input: FileTaxReturnVersionInput) {
    const taxReturn = await this.prisma.taxReturn.findUnique({
      where: { id: input.taxReturnId },
      include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } },
    });
    if (!taxReturn) {
      throw new NotFoundException(`TaxReturn ${input.taxReturnId} not found`);
    }

    const latest = taxReturn.versions[0];
    const nextVersionNumber = latest ? latest.versionNumber + 1 : 1;
    const submittedAt = new Date();
    const payloadHash = hashTaxReturnPayload(input.declarationData);

    const version = await this.prisma.taxReturnVersion.create({
      data: {
        taxReturnId: taxReturn.id,
        versionNumber: nextVersionNumber,
        isAmendment: input.isAmendment ?? nextVersionNumber > 1,
        declarationData: input.declarationData as Prisma.InputJsonValue,
        payloadHash,
        submittedByIdentityId: input.submittedByIdentityId,
        submittedAt,
        lockedAt: submittedAt,
      },
    });

    await this.prisma.taxReturn.update({
      where: { id: taxReturn.id },
      data: {
        currentVersionId: version.id,
        status: input.isAmendment ? TaxReturnStatus.AMENDED : TaxReturnStatus.SUBMITTED,
        submittedAt,
      },
    });

    return {
      version,
      filingDisclaimer: REVENUE_BOUNDARY_DISCLAIMER,
    };
  }

  async amendReturn(input: FileTaxReturnVersionInput) {
    return this.submitVersion({ ...input, isAmendment: true });
  }

  async attemptDestructiveEdit(versionId: string, declarationData: Record<string, unknown>) {
    const version = await this.prisma.taxReturnVersion.findUnique({ where: { id: versionId } });
    if (!version) {
      throw new NotFoundException(`TaxReturnVersion ${versionId} not found`);
    }

    this.boundary.assertSubmittedReturnVersionImmutable(version.lockedAt);

    await this.prisma.taxReturnVersion.update({
      where: { id: versionId },
      data: {
        declarationData: declarationData as Prisma.InputJsonValue,
        payloadHash: hashTaxReturnPayload(declarationData),
      },
    });
  }

  async assertReturnDiffersFromAssessment(taxReturnId: string, taxAssessmentId: string) {
    const assessment = await this.prisma.taxAssessment.findUnique({
      where: { id: taxAssessmentId },
    });
    if (!assessment) {
      throw new NotFoundException(`TaxAssessment ${taxAssessmentId} not found`);
    }
    if (assessment.taxReturnId === taxReturnId) {
      throw new BadRequestException(
        'Tax return linkage does not merge return content into assessment',
      );
    }
  }
}
