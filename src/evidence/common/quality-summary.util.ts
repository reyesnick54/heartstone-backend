import { EvidenceQualityLevel } from '@prisma/client';

export interface QualityAssessmentInput {
  qualityLevel: EvidenceQualityLevel;
  limitations: string | null;
  missingElements: unknown;
}

export interface StructuredQualitySummary {
  assessments: Array<{
    qualityLevel: EvidenceQualityLevel;
    limitations: string | null;
    missingElements: unknown;
  }>;
  hasInsufficient: boolean;
  hasContradicted: boolean;
  hasUnverified: boolean;
  criticalMissingElements: string[];
  disclaimer: string;
}

const QUALITY_DISCLAIMER =
  'Quality summary is derived only from recorded EvidenceQualityAssessments. It does not generate an aggregate score and does not prove evidence authenticity.';

export function buildQualitySummary(
  assessments: QualityAssessmentInput[],
): StructuredQualitySummary {
  const criticalMissingElements: string[] = [];

  for (const assessment of assessments) {
    const elements = Array.isArray(assessment.missingElements)
      ? (assessment.missingElements as string[])
      : [];
    for (const element of elements) {
      if (typeof element === 'string' && element.length > 0) {
        criticalMissingElements.push(element);
      }
    }
  }

  return {
    assessments: assessments.map((a) => ({
      qualityLevel: a.qualityLevel,
      limitations: a.limitations,
      missingElements: a.missingElements,
    })),
    hasInsufficient: assessments.some((a) => a.qualityLevel === EvidenceQualityLevel.INSUFFICIENT),
    hasContradicted: assessments.some((a) => a.qualityLevel === EvidenceQualityLevel.CONTRADICTED),
    hasUnverified: assessments.some((a) => a.qualityLevel === EvidenceQualityLevel.UNVERIFIED),
    criticalMissingElements: [...new Set(criticalMissingElements)],
    disclaimer: QUALITY_DISCLAIMER,
  };
}
