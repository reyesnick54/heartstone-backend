import { Test, type TestingModule } from '@nestjs/testing';
import {
  EligibilityGuidanceOutcome,
  ServiceEligibilityRuleCategory,
  ServiceEligibilityRuleOperator,
  ServiceEligibilityRuleStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import {
  ELIGIBILITY_GUIDANCE_DISCLAIMER,
  FORBIDDEN_ELIGIBILITY_OUTCOMES,
} from '../service-catalog.constants';
import { EligibilityEvaluatorService } from './eligibility-evaluator.service';

describe('EligibilityEvaluatorService', () => {
  let service: EligibilityEvaluatorService;
  const prisma = { representativeAuthority: { findFirst: jest.fn() } };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EligibilityEvaluatorService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(EligibilityEvaluatorService);
    jest.clearAllMocks();
  });

  const baseRule = {
    id: 'rule-1',
    governmentServiceVersionId: 'version-1',
    attributeKey: 'applicantCategory',
    reasonCode: 'APPLICANT_CATEGORY_MATCH',
    priority: 0,
    onFailureOutcome: null,
    status: ServiceEligibilityRuleStatus.ACTIVE,
    effectiveFrom: new Date('2020-01-01'),
    effectiveUntil: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('evaluates applicant category as LIKELY_ELIGIBLE when rule matches', async () => {
    const result = await service.evaluate(
      'service-1',
      'version-1',
      '1.0.0',
      [
        {
          ...baseRule,
          category: ServiceEligibilityRuleCategory.APPLICANT_CATEGORY,
          operator: ServiceEligibilityRuleOperator.EQUALS,
          expectedValue: { value: 'INDIVIDUAL' },
        },
      ],
      { applicantCategory: 'INDIVIDUAL' },
      [],
    );

    expect(result.outcome).toBe(EligibilityGuidanceOutcome.LIKELY_ELIGIBLE);
    expect(result.governmentServiceVersionId).toBe('version-1');
    expect(result.disclaimer).toBe(ELIGIBILITY_GUIDANCE_DISCLAIMER);
  });

  it('returns OUTSIDE_PUBLISHED_SCOPE for excluded activity', async () => {
    const result = await service.evaluate(
      'service-1',
      'version-1',
      '1.0.0',
      [
        {
          ...baseRule,
          category: ServiceEligibilityRuleCategory.EXCLUSION,
          attributeKey: 'activity',
          operator: ServiceEligibilityRuleOperator.EQUALS,
          expectedValue: { value: 'GAMBLING' },
          reasonCode: 'EXCLUDED_ACTIVITY',
        },
      ],
      { activity: 'GAMBLING' },
      [],
    );

    expect(result.outcome).toBe(EligibilityGuidanceOutcome.OUTSIDE_PUBLISHED_SCOPE);
    expect(result.excludedActivity).toBe('GAMBLING');
  });

  it('returns MORE_INFORMATION_REQUIRED when fact is missing', async () => {
    const result = await service.evaluate(
      'service-1',
      'version-1',
      '1.0.0',
      [
        {
          ...baseRule,
          category: ServiceEligibilityRuleCategory.APPLICANT_CATEGORY,
          operator: ServiceEligibilityRuleOperator.EQUALS,
          expectedValue: { value: 'INDIVIDUAL' },
        },
      ],
      {},
      [],
    );

    expect(result.outcome).toBe(EligibilityGuidanceOutcome.MORE_INFORMATION_REQUIRED);
    expect(result.missingFacts).toContain('applicantCategory');
  });

  it('does not treat representative presence as applicant eligibility', async () => {
    prisma.representativeAuthority.findFirst.mockResolvedValue({ id: 'rep-1' });

    const result = await service.evaluate(
      'service-1',
      'version-1',
      '1.0.0',
      [
        {
          ...baseRule,
          category: ServiceEligibilityRuleCategory.REPRESENTATIVE_REQUIREMENT,
          attributeKey: 'representativeContext',
          operator: ServiceEligibilityRuleOperator.EXISTS,
          expectedValue: {},
          reasonCode: 'REPRESENTATIVE_REQUIRED',
        },
        {
          ...baseRule,
          id: 'rule-2',
          category: ServiceEligibilityRuleCategory.APPLICANT_CATEGORY,
          operator: ServiceEligibilityRuleOperator.EQUALS,
          expectedValue: { value: 'INDIVIDUAL' },
        },
      ],
      {
        representativeContext: { organizationId: 'org-1', identityId: 'id-1' },
      },
      [],
    );

    expect(result.outcome).toBe(EligibilityGuidanceOutcome.MORE_INFORMATION_REQUIRED);
    expect(result.reasonCodes).toContain('REPRESENTATIVE_PRESENT');
  });

  it('never returns APPROVED outcome', async () => {
    const result = await service.evaluate('service-1', 'version-1', '1.0.0', [], {}, []);
    expect(FORBIDDEN_ELIGIBILITY_OUTCOMES).not.toContain(result.outcome);
    expect(result.outcome).not.toBe('APPROVED');
  });

  it('fails closed for unknown operators', () => {
    const matched = service.applyOperator('INVALID' as ServiceEligibilityRuleOperator, 'a', 'a');
    expect(matched).toBe(false);
  });
});
