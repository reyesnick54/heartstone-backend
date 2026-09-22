import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PublicSafetyOfficialNoticeStatus } from '@prisma/client';

import {
  FORBIDDEN_AI_PUBLIC_SAFETY_ACTIONS,
  FORBIDDEN_CITIZEN_PUBLIC_SAFETY_ACTIONS,
  PLATFORM_ADMIN_PUBLIC_SAFETY_ROLE_MARKER,
  PUBLIC_SAFETY_REASON_CODES,
} from '../public-safety.constants';
import {
  FORBIDDEN_CLIENT_EMERGENCY_DECLARATION_FIELDS,
  FORBIDDEN_CLIENT_INCIDENT_VERIFICATION_FIELDS,
  FORBIDDEN_CLIENT_NOTICE_PUBLISH_FIELDS,
} from '../public-safety-schema.constants';

@Injectable()
export class PublicSafetyBoundaryService {
  rejectClientForgedIncidentVerificationFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CLIENT_INCIDENT_VERIFICATION_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(
          `${PUBLIC_SAFETY_REASON_CODES.CROSS_REPORTER_ACCESS_DENIED}: ${field}`,
        );
      }
    }
  }

  rejectClientForgedNoticeLifecycleFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CLIENT_NOTICE_PUBLISH_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(
          `${PUBLIC_SAFETY_REASON_CODES.UNAUTHORIZED_NOTICE_PUBLISH}: ${field}`,
        );
      }
    }
  }

  rejectClientEmergencyAuthorityFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CLIENT_EMERGENCY_DECLARATION_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(
          `${PUBLIC_SAFETY_REASON_CODES.PLATFORM_ADMIN_CANNOT_CREATE_EMERGENCY_AUTHORITY}: ${field}`,
        );
      }
    }
  }

  assertCitizenCannotIssuePublicEmergencyAlert(action: string): void {
    if (
      FORBIDDEN_CITIZEN_PUBLIC_SAFETY_ACTIONS.includes(
        action as (typeof FORBIDDEN_CITIZEN_PUBLIC_SAFETY_ACTIONS)[number],
      )
    ) {
      throw new ForbiddenException(PUBLIC_SAFETY_REASON_CODES.CITIZEN_CANNOT_ISSUE_ALERT);
    }
  }

  assertAiCannotIssuePublicEmergencyDeclaration(action: string): void {
    if (
      FORBIDDEN_AI_PUBLIC_SAFETY_ACTIONS.includes(
        action as (typeof FORBIDDEN_AI_PUBLIC_SAFETY_ACTIONS)[number],
      )
    ) {
      throw new ForbiddenException(PUBLIC_SAFETY_REASON_CODES.AI_CANNOT_DECLARE_EMERGENCY);
    }
  }

  assertPlatformAdminCannotCreateEmergencyAuthority(
    actorRoleMarker: string | undefined,
    action: string,
  ): void {
    if (
      actorRoleMarker === PLATFORM_ADMIN_PUBLIC_SAFETY_ROLE_MARKER &&
      (action.includes('EMERGENCY_AUTHORITY') || action.includes('EMERGENCY_POWERS'))
    ) {
      throw new ForbiddenException(
        PUBLIC_SAFETY_REASON_CODES.PLATFORM_ADMIN_CANNOT_CREATE_EMERGENCY_AUTHORITY,
      );
    }
  }

  assertExecutiveDashboardIsReadOnly(requestedMutation: boolean): void {
    if (requestedMutation) {
      throw new ForbiddenException(PUBLIC_SAFETY_REASON_CODES.DASHBOARD_MUTATION_FORBIDDEN);
    }
  }

  assertRecoveryAssistanceSeparateFromIncidentReport(input: {
    recoveryApplicationReference: string;
    incidentReportReference?: string | null;
    mergedIntoIncidentReport: boolean;
  }): void {
    if (input.mergedIntoIncidentReport || input.incidentReportReference) {
      throw new BadRequestException(PUBLIC_SAFETY_REASON_CODES.RECOVERY_MUST_NOT_MERGE_INCIDENT);
    }
  }

  assertNoticePublishRequiresApprovedContent(input: {
    status: PublicSafetyOfficialNoticeStatus;
    approvedContent?: string | null;
  }): void {
    if (input.status !== PublicSafetyOfficialNoticeStatus.APPROVED || !input.approvedContent) {
      throw new BadRequestException(
        PUBLIC_SAFETY_REASON_CODES.NOTICE_PUBLISH_REQUIRES_APPROVED_CONTENT,
      );
    }
  }

  resolvePublicNoticeContent(input: {
    status: PublicSafetyOfficialNoticeStatus;
    draftContent: string;
    approvedContent?: string | null;
    publishedContent?: string | null;
  }): string {
    if (input.status === PublicSafetyOfficialNoticeStatus.PUBLISHED) {
      return input.publishedContent ?? input.approvedContent ?? '';
    }
    throw new ForbiddenException(PUBLIC_SAFETY_REASON_CODES.PUBLIC_NOTICE_DRAFT_LEAK);
  }

  sanitizeIncidentReportForProjection(input: {
    verificationStatus: string;
    summaryLabel: string;
    locationDescription?: string | null;
    protectsReporterIdentity: boolean;
    reporterIdentityId?: string | null;
    viewerIdentityId?: string;
  }) {
    const verificationLabel = input.verificationStatus === 'VERIFIED' ? 'verified' : 'unverified';

    return {
      summaryLabel: input.summaryLabel,
      locationDescription: input.locationDescription ?? null,
      verificationStatus: input.verificationStatus,
      verificationLabel,
      isVerified: input.verificationStatus === 'VERIFIED',
      reporterIdentityRedacted:
        input.protectsReporterIdentity &&
        input.reporterIdentityId !== undefined &&
        input.viewerIdentityId !== input.reporterIdentityId,
    };
  }
}
