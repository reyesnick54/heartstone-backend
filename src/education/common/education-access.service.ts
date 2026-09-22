import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { GuardianEducationRelationshipStatus, MembershipStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { EDUCATION_REASON_CODES, type EducationGuardianAccessScope } from '../education.constants';
import { EducationBoundaryService } from './education-boundary.service';

export interface StudentSelfAccessContext {
  accessorIdentityId: string;
  studentEducationProfileId: string;
  endpoint: string;
}

export interface GuardianAccessContext {
  accessorIdentityId: string;
  studentEducationProfileId: string;
  endpoint: string;
  requestedScope: keyof EducationGuardianAccessScope;
}

@Injectable()
export class EducationAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: EducationBoundaryService,
  ) {}

  async assertStudentSelfAccess(context: StudentSelfAccessContext): Promise<void> {
    const profile = await this.prisma.studentEducationProfile.findUnique({
      where: { id: context.studentEducationProfileId },
    });
    if (!profile) {
      throw new NotFoundException('Student education profile not found');
    }

    this.boundary.assertCrossStudentAccessBlocked(
      context.accessorIdentityId,
      profile.studentIdentityId,
    );
  }

  async assertGuardianAuthorizedAccess(context: GuardianAccessContext): Promise<void> {
    const profile = await this.prisma.studentEducationProfile.findUnique({
      where: { id: context.studentEducationProfileId },
    });
    if (!profile) {
      throw new NotFoundException('Student education profile not found');
    }

    const relationship = await this.prisma.guardianEducationRelationship.findFirst({
      where: {
        studentEducationProfileId: context.studentEducationProfileId,
        guardianIdentityId: context.accessorIdentityId,
      },
      orderBy: { effectiveFrom: 'desc' },
    });

    if (!relationship) {
      throw new ForbiddenException(EDUCATION_REASON_CODES.GUARDIAN_RELATIONSHIP_REQUIRED);
    }

    const now = new Date();
    const active =
      relationship.status === GuardianEducationRelationshipStatus.ACTIVE &&
      relationship.effectiveFrom <= now &&
      (relationship.effectiveUntil == null || relationship.effectiveUntil > now);

    if (!active) {
      throw new ForbiddenException(EDUCATION_REASON_CODES.GUARDIAN_ACCESS_REVOKED);
    }

    const scopes = relationship.authorizedAccessScopes as EducationGuardianAccessScope;
    this.boundary.assertGuardianScope(scopes, context.requestedScope);
  }

  async resolveGuardianAuthorizedStudentProfileIds(guardianIdentityId: string): Promise<string[]> {
    const now = new Date();
    const links = await this.prisma.guardianEducationRelationship.findMany({
      where: {
        guardianIdentityId,
        status: GuardianEducationRelationshipStatus.ACTIVE,
        effectiveFrom: { lte: now },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: now } }],
      },
      select: { studentEducationProfileId: true, authorizedAccessScopes: true },
    });

    return links
      .filter((link) => {
        const scope = link.authorizedAccessScopes as EducationGuardianAccessScope;
        return (
          scope.viewEnrollmentSummary === true ||
          scope.viewTranscriptSummary === true ||
          scope.viewSupportPrograms === true
        );
      })
      .map((link) => link.studentEducationProfileId);
  }

  async assertOrganizationEducationAccess(
    identityId: string,
    organizationId: string,
  ): Promise<void> {
    const now = new Date();
    const membership = await this.prisma.organizationMembership.findFirst({
      where: {
        identityId,
        organizationId,
        status: MembershipStatus.ACTIVE,
        effectiveFrom: { lte: now },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: now } }],
      },
    });
    if (!membership) {
      throw new ForbiddenException(EDUCATION_REASON_CODES.ORGANIZATION_MEMBERSHIP_REQUIRED);
    }

    const institution = await this.prisma.educationInstitution.findFirst({
      where: { organizationId },
    });
    if (!institution) {
      throw new ForbiddenException(EDUCATION_REASON_CODES.INSTITUTION_PROFILE_REQUIRED);
    }
  }
}
