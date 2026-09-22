import { Injectable } from '@nestjs/common';
import {
  ClinicalTrialListingLifecycleStatus,
  ClinicalTrialRecruitmentStatus,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import {
  CLINICAL_RESEARCH_BOUNDARY_DISCLAIMER,
  PUBLIC_TRIAL_DISCOVERY_FORBIDDEN_RESPONSE_KEYS,
} from '../clinical-research.constants';

export interface ClinicalTrialDiscoveryQuery {
  conditionCategoryCode?: string;
  recruitmentStatus?: ClinicalTrialRecruitmentStatus;
  phaseCode?: string;
  jurisdictionId?: string;
  minimumAgeYears?: number;
  maximumAgeYears?: number;
  locationContains?: string;
  sponsorDisplayNameContains?: string;
}

@Injectable()
export class ClinicalTrialDiscoveryService {
  constructor(private readonly prisma: PrismaService) {}

  async discoverRecruitingTrials(query: ClinicalTrialDiscoveryQuery = {}) {
    const where: Prisma.ClinicalTrialWhereInput = {
      isPubliclyDiscoverable: true,
      recruitmentStatus: query.recruitmentStatus ?? ClinicalTrialRecruitmentStatus.RECRUITING,
      listingLifecycleStatus: {
        in: [
          ClinicalTrialListingLifecycleStatus.RECRUITING,
          ClinicalTrialListingLifecycleStatus.APPROVED_FOR_LISTING,
        ],
      },
      ...(query.jurisdictionId ? { jurisdictionId: query.jurisdictionId } : {}),
      ...(query.phaseCode ? { phaseReference: { code: query.phaseCode } } : {}),
      ...(query.conditionCategoryCode
        ? { conditionReference: { categoryCode: query.conditionCategoryCode } }
        : {}),
      ...(query.locationContains
        ? { locationSummary: { contains: query.locationContains, mode: 'insensitive' } }
        : {}),
      ...(query.sponsorDisplayNameContains
        ? {
            sponsor: {
              displayName: { contains: query.sponsorDisplayNameContains, mode: 'insensitive' },
            },
          }
        : {}),
      ...(query.minimumAgeYears !== undefined
        ? {
            OR: [{ minimumAgeYears: null }, { minimumAgeYears: { lte: query.minimumAgeYears } }],
          }
        : {}),
      ...(query.maximumAgeYears !== undefined
        ? {
            OR: [{ maximumAgeYears: null }, { maximumAgeYears: { gte: query.maximumAgeYears } }],
          }
        : {}),
    };

    const trials = await this.prisma.clinicalTrial.findMany({
      where,
      select: {
        id: true,
        trialNumber: true,
        recruitmentStatus: true,
        listingLifecycleStatus: true,
        minimumAgeYears: true,
        maximumAgeYears: true,
        locationSummary: true,
        listingIsNotRegulatoryApproval: true,
        discoveryIsNotRecommendation: true,
        phaseReference: { select: { code: true, label: true } },
        conditionReference: { select: { code: true, label: true, categoryCode: true } },
        interventionReference: { select: { code: true, label: true } },
        sponsor: { select: { displayName: true, sponsorReference: true } },
        currentTrialVersion: {
          select: {
            title: true,
            publicSummary: true,
            broadEligibilitySummary: true,
          },
        },
        eligibilityCriteria: {
          select: { criterionCode: true, summary: true, isInclusion: true, sortOrder: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { trialNumber: 'asc' },
    });

    return {
      disclaimer: CLINICAL_RESEARCH_BOUNDARY_DISCLAIMER,
      discoveryIsNotRecommendation: true,
      participantDataIncluded: false,
      forbiddenParticipantFields: PUBLIC_TRIAL_DISCOVERY_FORBIDDEN_RESPONSE_KEYS,
      trials: trials.map((trial) => this.toPublicDiscoveryTrial(trial)),
    };
  }

  private toPublicDiscoveryTrial(trial: {
    trialNumber: string;
    recruitmentStatus: ClinicalTrialRecruitmentStatus;
    listingLifecycleStatus: ClinicalTrialListingLifecycleStatus;
    minimumAgeYears: number | null;
    maximumAgeYears: number | null;
    locationSummary: string | null;
    listingIsNotRegulatoryApproval: boolean;
    discoveryIsNotRecommendation: boolean;
    phaseReference: { code: string; label: string } | null;
    conditionReference: { code: string; label: string; categoryCode: string | null } | null;
    interventionReference: { code: string; label: string } | null;
    sponsor: { displayName: string; sponsorReference: string };
    currentTrialVersion: {
      title: string;
      publicSummary: string;
      broadEligibilitySummary: string | null;
    } | null;
    eligibilityCriteria: {
      criterionCode: string;
      summary: string;
      isInclusion: boolean;
      sortOrder: number;
    }[];
  }) {
    const payload = {
      trialNumber: trial.trialNumber,
      recruitmentStatus: trial.recruitmentStatus,
      listingLifecycleStatus: trial.listingLifecycleStatus,
      minimumAgeYears: trial.minimumAgeYears,
      maximumAgeYears: trial.maximumAgeYears,
      locationSummary: trial.locationSummary,
      phase: trial.phaseReference,
      condition: trial.conditionReference,
      intervention: trial.interventionReference,
      sponsor: trial.sponsor,
      title: trial.currentTrialVersion?.title ?? null,
      publicSummary: trial.currentTrialVersion?.publicSummary ?? null,
      broadEligibilitySummary: trial.currentTrialVersion?.broadEligibilitySummary ?? null,
      eligibilityCriteria: trial.eligibilityCriteria,
      listingIsNotRegulatoryApproval: trial.listingIsNotRegulatoryApproval,
      discoveryIsNotRecommendation: trial.discoveryIsNotRecommendation,
    };

    for (const forbidden of PUBLIC_TRIAL_DISCOVERY_FORBIDDEN_RESPONSE_KEYS) {
      if (forbidden in payload) {
        throw new Error(`Public discovery payload must not expose ${forbidden}`);
      }
    }

    return payload;
  }
}
