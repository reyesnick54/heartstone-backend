import { EvidenceQualityRating } from '@prisma/client';

export interface QualityAssessmentInput {
  criterion: string;
  rating: EvidenceQualityRating;
  limitations: string | null;
  notes: string | null;
}

export interface StructuredQualitySummary {
  assessments: {
    criterion: string;
    rating: EvidenceQualityRating;
    limitations: string | null;
    notes: string | null;
  }[];
  hasInsufficient: boolean;
  hasWeak: boolean;
  hasUnassessed: boolean;
  disclaimer: string;
}

const QUALITY_DISCLAIMER =
  'Quality summary is derived only from recorded EvidenceQualityAssessments. It does not generate an aggregate score and does not prove evidence authenticity.';

export function buildQualitySummary(
  assessments: QualityAssessmentInput[],
): StructuredQualitySummary {
  return {
    assessments: assessments.map((a) => ({
      criterion: a.criterion,
      rating: a.rating,
      limitations: a.limitations,
      notes: a.notes,
    })),
    hasInsufficient: assessments.some((a) => a.rating === EvidenceQualityRating.INSUFFICIENT),
    hasWeak: assessments.some((a) => a.rating === EvidenceQualityRating.WEAK),
    hasUnassessed: assessments.some((a) => a.rating === EvidenceQualityRating.UNASSESSED),
    disclaimer: QUALITY_DISCLAIMER,
  };
}
