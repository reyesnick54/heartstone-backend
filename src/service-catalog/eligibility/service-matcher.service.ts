import { Injectable } from '@nestjs/common';
import { GovernmentServiceVersionStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { type ApplicantFacts, EligibilityEvaluatorService } from './eligibility-evaluator.service';

export interface ServiceMatchResult {
  primaryService?: {
    governmentServiceId: string;
    code: string;
    name: string;
    outcome: string;
  };
  relatedServices: { code: string; name: string }[];
  excludedServices: { code: string; name: string; reason: string }[];
  possibleDependencies: string[];
  moreInformationNeeded: string[];
  disclaimer: string;
}

@Injectable()
export class ServiceMatcherService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly evaluator: EligibilityEvaluatorService,
  ) {}

  async match(facts: ApplicantFacts): Promise<ServiceMatchResult> {
    const now = new Date();
    const publishedVersions = await this.prisma.governmentServiceVersion.findMany({
      where: {
        status: GovernmentServiceVersionStatus.PUBLISHED,
        effectiveFrom: { lte: now },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: now } }],
      },
      include: {
        governmentService: true,
        eligibilityRules: {
          where: { status: 'ACTIVE' },
        },
      },
    });

    const relatedServices: { code: string; name: string }[] = [];
    const excludedServices: { code: string; name: string; reason: string }[] = [];
    const moreInformationNeeded: string[] = [];
    const possibleDependencies: string[] = [];
    let primaryService: ServiceMatchResult['primaryService'];

    let bestScore = -1;

    for (const version of publishedVersions) {
      const result = await this.evaluator.evaluate(
        version.governmentServiceId,
        version.id,
        version.versionLabel,
        version.eligibilityRules,
        facts,
        version.dependencyCodes,
      );

      if (result.missingFacts.length > 0) {
        moreInformationNeeded.push(...result.missingFacts);
      }

      if (result.outcome === 'OUTSIDE_PUBLISHED_SCOPE') {
        excludedServices.push({
          code: version.governmentService.code,
          name: version.governmentService.name,
          reason: result.excludedActivity ?? 'outside published scope',
        });
        continue;
      }

      if (result.outcome === 'LIKELY_INELIGIBLE') {
        excludedServices.push({
          code: version.governmentService.code,
          name: version.governmentService.name,
          reason: 'likely ineligible based on supplied facts',
        });
        continue;
      }

      const score = result.matchedRules.length - result.failedRules.length;
      if (
        score > bestScore &&
        (result.outcome === 'LIKELY_ELIGIBLE' || result.outcome === 'MORE_INFORMATION_REQUIRED')
      ) {
        bestScore = score;
        primaryService = {
          governmentServiceId: version.governmentServiceId,
          code: version.governmentService.code,
          name: version.governmentService.name,
          outcome: result.outcome,
        };
        possibleDependencies.push(...version.dependencyCodes);
      }

      for (const relatedCode of version.relatedServiceCodes) {
        const related = publishedVersions.find((v) => v.governmentService.code === relatedCode);
        if (related) {
          relatedServices.push({
            code: related.governmentService.code,
            name: related.governmentService.name,
          });
        }
      }
    }

    const uniqueRelated = this.dedupeByCode(relatedServices);
    const uniqueExcluded = this.dedupeByCode(excludedServices);

    return {
      primaryService,
      relatedServices: uniqueRelated,
      excludedServices: uniqueExcluded,
      possibleDependencies: [...new Set(possibleDependencies)],
      moreInformationNeeded: [...new Set(moreInformationNeeded)],
      disclaimer:
        'This service matching result is navigation assistance only. It does not open a case, make a legal determination, or guarantee eligibility.',
    };
  }

  private dedupeByCode<T extends { code: string }>(items: T[]): T[] {
    const seen = new Set<string>();
    return items.filter((item) => {
      if (seen.has(item.code)) {
        return false;
      }
      seen.add(item.code);
      return true;
    });
  }
}
