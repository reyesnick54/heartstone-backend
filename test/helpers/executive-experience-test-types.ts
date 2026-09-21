export interface ExecutiveHomeBody {
  visibilityDoesNotCreateAuthority: boolean;
  executiveDashboardIsNotCommandAuthority: boolean;
  metricIsNotVerifiedLegalFact: boolean;
  riskScoreIsNotSanction: boolean;
  hasStaleProjections: boolean;
  staleProjectionCount: number;
  governmentOperations: Record<string, unknown>;
  economyInvestment: Record<string, unknown>;
  compliance: Record<string, unknown>;
  digitalGovernment: Record<string, unknown>;
  risk: Record<string, unknown>;
}

export interface ExecutiveInvestmentBody {
  reportedMilestones: {
    milestoneId: string;
    isVerified: boolean;
    isReportedOnly: boolean;
    reportedMilestoneIsNotVerifiedMilestone?: boolean;
  }[];
  verifiedMilestones: {
    milestoneId: string;
    isVerified: boolean;
    isReportedOnly: boolean;
  }[];
  disclaimers: {
    reportedMilestoneIsNotVerifiedMilestone: boolean;
  };
}

export interface ExecutiveRiskBody {
  disclaimers: {
    riskScoreIsNotSanction: boolean;
  };
  riskAssessments?: {
    isSanction: boolean;
    riskScoreIsNotSanction: boolean;
  }[];
}

export interface ExecutiveAlertsBody {
  alerts: {
    alertId: string;
    isConfirmedViolation: boolean;
    isVerified: boolean;
    hasVerificationRecord: boolean;
    aiAlertIsNotConfirmedViolationWithoutVerification: boolean;
  }[];
  disclaimers: {
    aiAlertIsNotConfirmedViolationWithoutVerification: boolean;
  };
}

export interface ExecutiveSectionBody {
  generatedAt: string;
  institutionId: string;
}

export function asExecutiveHomeBody(body: unknown): ExecutiveHomeBody {
  return body as ExecutiveHomeBody;
}

export function asExecutiveInvestmentBody(body: unknown): ExecutiveInvestmentBody {
  return body as ExecutiveInvestmentBody;
}

export function asExecutiveRiskBody(body: unknown): ExecutiveRiskBody {
  return body as ExecutiveRiskBody;
}

export function asExecutiveAlertsBody(body: unknown): ExecutiveAlertsBody {
  return body as ExecutiveAlertsBody;
}

export function asExecutiveSectionBody(body: unknown): ExecutiveSectionBody {
  return body as ExecutiveSectionBody;
}
