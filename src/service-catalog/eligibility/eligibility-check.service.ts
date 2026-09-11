import { Injectable, NotFoundException } from '@nestjs/common';
import { type ServiceEligibilityRule } from '@prisma/client';

import { GovernmentServicesService } from '../government-services/government-services.service';
import {
  type ApplicantFacts,
  EligibilityEvaluatorService,
  type EligibilityGuidanceResult,
} from './eligibility-evaluator.service';

@Injectable()
export class EligibilityCheckService {
  constructor(
    private readonly governmentServices: GovernmentServicesService,
    private readonly evaluator: EligibilityEvaluatorService,
  ) {}

  async check(
    serviceId: string,
    facts: ApplicantFacts,
    versionId?: string,
  ): Promise<EligibilityGuidanceResult> {
    await this.governmentServices.findOne(serviceId);

    let version;
    if (versionId) {
      version = await this.governmentServices.getVersionById(versionId);
      if (version.governmentServiceId !== serviceId) {
        throw new NotFoundException(`Version ${versionId} does not belong to service ${serviceId}`);
      }
    } else {
      version = await this.governmentServices.getCurrentPublishedVersion(serviceId);
      if (!version) {
        throw new NotFoundException(`No published version available for service ${serviceId}`);
      }
    }

    const rules = await this.loadActiveRules(version.id);
    const now = new Date();
    const activeRules = rules.filter(
      (rule) =>
        rule.status === 'ACTIVE' &&
        rule.effectiveFrom <= now &&
        (rule.effectiveUntil === null || rule.effectiveUntil > now),
    );

    return this.evaluator.evaluate(
      serviceId,
      version.id,
      version.versionLabel,
      activeRules,
      facts,
      version.dependencyCodes,
    );
  }

  private async loadActiveRules(versionId: string): Promise<ServiceEligibilityRule[]> {
    const version = await this.governmentServices.getVersionById(versionId);
    return version.eligibilityRules;
  }
}
