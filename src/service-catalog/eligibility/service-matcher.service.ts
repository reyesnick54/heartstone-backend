import { Injectable } from '@nestjs/common';
import { GovernmentServiceMaturityStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { PUBLICLY_PRESENTABLE_AVAILABILITY } from '../common/public-discovery.constants';
import { type ApplicantFacts, EligibilityEvaluatorService } from './eligibility-evaluator.service';
import { EligibilityVersionAccessService } from './eligibility-version-access.service';

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
    private readonly versionAccess: EligibilityVersionAccessService,
  ) {}

  async match(facts: ApplicantFacts): Promise<ServiceMatchResult> {
    const now = new Date();
    const publishedVersions = await this.prisma.governmentServiceVersion.findMany({
      where: {
        maturityStatus: GovernmentServiceMaturityStatus.ACTIVE,
        publicAvailability: { in: PUBLICLY_PRESENTABLE_AVAILABILITY },
        AND: [
          {
            OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: now } }],
          },
          {
            OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: now } }],
          },
        ],
      },
      include: {
        governmentService: true,
        serviceEligibilityRules: {
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
      const dependencyCodes = this.versionAccess.extractDependencyCodes(version.majorDependencies);
      const result = await this.evaluator.evaluate(
        version.governmentServiceId,
        version.id,
        version.version,
        version.serviceEligibilityRules,
        facts,
        dependencyCodes,
      );

      if (result.missingFacts.length > 0) {
        moreInformationNeeded.push(...result.missingFacts);
      }

      if (result.outcome === 'OUTSIDE_PUBLISHED_SCOPE') {
        excludedServices.push({
          code: version.governmentService.code,
          name: version.governmentService.publicName,
          reason: result.excludedActivity ?? 'outside published scope',
        });
        continue;
      }

      if (result.outcome === 'LIKELY_INELIGIBLE') {
        excludedServices.push({
          code: version.governmentService.code,
          name: version.governmentService.publicName,
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
          name: version.governmentService.publicName,
          outcome: result.outcome,
        };
        possibleDependencies.push(...dependencyCodes);
      }

      const relatedCodes = this.versionAccess.extractRelatedServiceCodes(version.majorDependencies);
      for (const relatedCode of relatedCodes) {
        const related = publishedVersions.find((v) => v.governmentService.code === relatedCode);
        if (related) {
          relatedServices.push({
            code: related.governmentService.code,
            name: related.governmentService.publicName,
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
