import { Injectable, NotFoundException } from '@nestjs/common';
import {
  GovernmentServiceVersionStatus,
  Prisma,
  ServiceEligibilityRule,
  ServiceEligibilityRuleStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import {
  EligibilityRuleAuditContext,
  ServiceCatalogAuditService,
} from '../common/service-catalog-audit.service';
import { ServiceCatalogValidationService } from '../common/service-catalog-validation.service';
import { GovernmentServicesService } from '../government-services/government-services.service';
import { CreateEligibilityRuleDto } from './dto/create-eligibility-rule.dto';
import { UpdateEligibilityRuleDto } from './dto/update-eligibility-rule.dto';

@Injectable()
export class EligibilityRulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validation: ServiceCatalogValidationService,
    private readonly audit: ServiceCatalogAuditService,
    private readonly governmentServices: GovernmentServicesService,
  ) {}

  async create(
    serviceId: string,
    versionId: string,
    dto: CreateEligibilityRuleDto,
    auditContext: EligibilityRuleAuditContext,
  ): Promise<ServiceEligibilityRule> {
    await this.governmentServices.findOne(serviceId);
    const version = await this.governmentServices.getVersionById(versionId);

    if (version.governmentServiceId !== serviceId) {
      throw new NotFoundException(`Version ${versionId} does not belong to service ${serviceId}`);
    }

    this.validation.assertVersionAllowsRuleMutation(version.status);
    this.validation.validateRuleConfiguration(dto);

    const rule = await this.prisma.serviceEligibilityRule.create({
      data: {
        governmentServiceVersionId: versionId,
        category: dto.category,
        attributeKey: dto.attributeKey,
        operator: dto.operator,
        expectedValue: dto.expectedValue as Prisma.InputJsonValue,
        reasonCode: dto.reasonCode,
        priority: dto.priority ?? 0,
        onFailureOutcome: dto.onFailureOutcome,
        effectiveFrom: new Date(dto.effectiveFrom),
        effectiveUntil: dto.effectiveUntil ? new Date(dto.effectiveUntil) : undefined,
      },
    });

    await this.audit.recordRuleCreated(auditContext, rule.id, versionId, this.toSnapshot(rule));

    return rule;
  }

  async findByService(serviceId: string): Promise<ServiceEligibilityRule[]> {
    const publishedVersion = await this.governmentServices.getCurrentPublishedVersion(serviceId);
    if (!publishedVersion) {
      return [];
    }

    const now = new Date();
    return this.prisma.serviceEligibilityRule.findMany({
      where: {
        governmentServiceVersionId: publishedVersion.id,
        status: ServiceEligibilityRuleStatus.ACTIVE,
        effectiveFrom: { lte: now },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: now } }],
      },
      orderBy: [{ priority: 'asc' }],
    });
  }

  async findByVersion(versionId: string): Promise<ServiceEligibilityRule[]> {
    return this.prisma.serviceEligibilityRule.findMany({
      where: { governmentServiceVersionId: versionId },
      orderBy: [{ priority: 'asc' }],
    });
  }

  async update(
    ruleId: string,
    dto: UpdateEligibilityRuleDto,
    auditContext: EligibilityRuleAuditContext,
  ): Promise<ServiceEligibilityRule> {
    const existing = await this.prisma.serviceEligibilityRule.findUnique({
      where: { id: ruleId },
      include: { governmentServiceVersion: true },
    });

    if (!existing) {
      throw new NotFoundException(`Eligibility rule ${ruleId} not found`);
    }

    this.validation.assertVersionAllowsRuleMutation(
      existing.governmentServiceVersion.status,
      existing.status,
    );

    if (dto.category || dto.attributeKey || dto.operator || dto.expectedValue !== undefined) {
      this.validation.validateRuleConfiguration({
        category: dto.category ?? existing.category,
        attributeKey: dto.attributeKey ?? existing.attributeKey,
        operator: dto.operator ?? existing.operator,
        expectedValue: dto.expectedValue ?? existing.expectedValue,
        reasonCode: dto.reasonCode ?? existing.reasonCode,
      });
    }

    const updated = await this.prisma.serviceEligibilityRule.update({
      where: { id: ruleId },
      data: {
        category: dto.category,
        attributeKey: dto.attributeKey,
        operator: dto.operator,
        expectedValue: dto.expectedValue as Prisma.InputJsonValue | undefined,
        reasonCode: dto.reasonCode,
        priority: dto.priority,
        onFailureOutcome: dto.onFailureOutcome,
        effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : undefined,
        effectiveUntil: dto.effectiveUntil ? new Date(dto.effectiveUntil) : undefined,
        status: dto.status,
      },
    });

    const isPublished =
      existing.governmentServiceVersion.status === GovernmentServiceVersionStatus.PUBLISHED;

    await this.audit.recordRuleUpdated(
      auditContext,
      ruleId,
      existing.governmentServiceVersionId,
      this.toSnapshot(existing),
      this.toSnapshot(updated),
      isPublished,
    );

    return updated;
  }

  async supersede(
    ruleId: string,
    auditContext: EligibilityRuleAuditContext,
  ): Promise<ServiceEligibilityRule> {
    return this.update(ruleId, { status: ServiceEligibilityRuleStatus.SUPERSEDED }, auditContext);
  }

  private toSnapshot(rule: ServiceEligibilityRule): Prisma.InputJsonValue {
    return {
      id: rule.id,
      category: rule.category,
      attributeKey: rule.attributeKey,
      operator: rule.operator,
      expectedValue: rule.expectedValue,
      reasonCode: rule.reasonCode,
      priority: rule.priority,
      onFailureOutcome: rule.onFailureOutcome,
      status: rule.status,
      effectiveFrom: rule.effectiveFrom.toISOString(),
      effectiveUntil: rule.effectiveUntil?.toISOString() ?? null,
    };
  }
}
