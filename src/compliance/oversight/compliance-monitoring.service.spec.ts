import { BadRequestException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { MonitoringRuleStatus, MonitoringRuleType } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ComplianceMonitoringService } from './compliance-monitoring.service';

describe('ComplianceMonitoringService', () => {
  let service: ComplianceMonitoringService;

  const prisma = {
    monitoringRule: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    complianceMonitoringEvent: { create: jest.fn() },
    complianceAlert: { create: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ComplianceMonitoringService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(ComplianceMonitoringService);
    jest.clearAllMocks();
  });

  it('rejects arbitrary executable monitoring expressions', async () => {
    await expect(
      service.createRule({
        code: 'BAD-RULE',
        name: 'Bad rule',
        ruleType: MonitoringRuleType.DUE_DATE_WARNING,
        structuredConfig: { expression: 'eval(malicious)' },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates alerts that are not violations', async () => {
    prisma.monitoringRule.findUnique.mockResolvedValue({
      id: 'rule-1',
      code: 'DUE-1',
      name: 'Due warning',
      status: MonitoringRuleStatus.ACTIVE,
      structuredConfig: { thresholdDays: 7 },
      warningDaysBefore: 1,
      criticalDaysBefore: 3,
    });
    prisma.complianceAlert.create.mockResolvedValue({
      id: 'alert-1',
      isViolation: false,
      isEnforcementDecision: false,
    });

    const alert = await service.evaluateRule({
      ruleId: 'rule-1',
      projectionId: 'proj-1',
      sourceDataRefs: [{ type: 'DecisionCondition', id: 'cond-1' }],
      countValue: 2,
    });

    expect(alert).toEqual(
      expect.objectContaining({ isViolation: false, isEnforcementDecision: false }),
    );
  });

  it('records risk score as non-sanctioning prioritization', async () => {
    prisma.complianceAlert.create.mockResolvedValue({
      id: 'risk-1',
      isViolation: false,
      isEnforcementDecision: false,
    });

    const alert = await service.recordRiskPrioritizationScore({
      projectionId: 'proj-1',
      score: 72,
      methodology: 'weighted-late-reporting-v1',
      methodologyVersion: '1.0.0',
      inputs: { lateReports: 3 },
      limitations: 'Advisory only',
    });

    expect(alert.isViolation).toBe(false);
    expect(alert.isEnforcementDecision).toBe(false);
  });
});
