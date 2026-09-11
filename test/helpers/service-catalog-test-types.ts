export interface GovernmentServiceBody {
  id: string;
  code: string;
  name: string;
}

export interface GovernmentServiceVersionBody {
  id: string;
  versionLabel: string;
  governmentServiceId: string;
}

export interface EligibilityGuidanceBody {
  outcome: string;
  governmentServiceVersionId: string;
  disclaimer: string;
  excludedActivity?: string;
  missingFacts: string[];
  matchedRules: unknown[];
}

export interface ServiceMatchBody {
  primaryService?: { code: string; name: string };
  disclaimer: string;
}

export function asGovernmentServiceBody(body: unknown): GovernmentServiceBody {
  return body as GovernmentServiceBody;
}

export function asGovernmentServiceVersionBody(body: unknown): GovernmentServiceVersionBody {
  return body as GovernmentServiceVersionBody;
}

export function asEligibilityGuidanceBody(body: unknown): EligibilityGuidanceBody {
  return body as EligibilityGuidanceBody;
}

export function asServiceMatchBody(body: unknown): ServiceMatchBody {
  return body as ServiceMatchBody;
}
