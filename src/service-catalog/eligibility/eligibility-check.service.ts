import { Injectable, NotFoundException } from '@nestjs/common';

import { GovernmentServicesService } from '../government-services/government-services.service';
import {
  type ApplicantFacts,
  EligibilityEvaluatorService,
  type EligibilityGuidanceResult,
} from './eligibility-evaluator.service';
import { EligibilityVersionAccessService } from './eligibility-version-access.service';

@Injectable()
export class EligibilityCheckService {
  constructor(
    private readonly governmentServices: GovernmentServicesService,
    private readonly versionAccess: EligibilityVersionAccessService,
    private readonly evaluator: EligibilityEvaluatorService,
  ) {}

  async check(
    serviceId: string,
    facts: ApplicantFacts,
    versionId?: string,
  ): Promise<EligibilityGuidanceResult> {
    await this.governmentServices.findOne(serviceId);

    const version = versionId
      ? await this.versionAccess.getVersionById(versionId)
      : await this.versionAccess.getCurrentPublishedVersion(serviceId);

    if (!version) {
      throw new NotFoundException(
        versionId
          ? `Government service version ${versionId} not found`
          : `No published version available for service ${serviceId}`,
      );
    }

    if (version.governmentServiceId !== serviceId) {
      throw new NotFoundException(`Version ${version.id} does not belong to service ${serviceId}`);
    }

    const now = new Date();
    const activeRules = version.serviceEligibilityRules.filter(
      (rule) =>
        rule.status === 'ACTIVE' &&
        rule.effectiveFrom <= now &&
        (rule.effectiveUntil === null || rule.effectiveUntil > now),
    );

    return this.evaluator.evaluate(
      serviceId,
      version.id,
      version.version,
      activeRules,
      facts,
      this.versionAccess.extractDependencyCodes(version.majorDependencies),
    );
  }
}
