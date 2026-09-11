import { type ServiceReadinessCheckOutcome, type ServiceReadinessLevel } from '@prisma/client';

import { type ServiceReadinessCheckCode } from './service-catalog-governance.constants';

export interface ServiceReadinessCheckResult {
  code: ServiceReadinessCheckCode;
  outcome: ServiceReadinessCheckOutcome;
  message: string;
}

export interface ServiceReadinessAssessment {
  governmentServiceVersionId: string;
  assessedAt: Date;
  achievedLevel: ServiceReadinessLevel;
  technicallyReady: boolean;
  institutionallyAccepted: boolean;
  operationallyActive: boolean;
  checks: ServiceReadinessCheckResult[];
  blockingIssues: string[];
}
