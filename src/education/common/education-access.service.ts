import { ForbiddenException, Injectable } from '@nestjs/common';
import { EducationGuardianRelationshipStatus, MembershipStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { type GuardianAuthorizedScope } from '../education.constants';
import { EducationBoundaryService } from './education-boundary.service';

@Injectable()
export class EducationAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: EducationBoundaryService,
  ) {}

  async assertStudentProfileAccess(
    requesterIdentityId: string,
    studentProfileId: string,
  ): Promise<void> {
    const profile = await this.prisma.educationStudentProfile.findUnique({
      where: { id: studentProfileId },
      select: { subjectIdentityId: true },
    });
    if (!profile) {
      throw new ForbiddenException('Education student profile not found');
    }

    if (profile.subjectIdentityId === requesterIdentityId) {
      return;
    }

    const now = new Date();
    const guardianLink = await this.prisma.educationGuardianRelationship.findFirst({
      where: {
        guardianIdentityId: requesterIdentityId,
        studentProfileId,
        status: {
          in: [
            EducationGuardianRelationshipStatus.ACTIVE,
            EducationGuardianRelationshipStatus.LIMITED,
          ],
        },
        effectiveFrom: { lte: now },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: now } }],
      },
    });

    if (!guardianLink) {
      throw new ForbiddenException('No authorized education access for this student profile');
    }
  }

  async resolveGuardianAuthorizedStudentProfileIds(guardianIdentityId: string): Promise<string[]> {
    const now = new Date();
    const links = await this.prisma.educationGuardianRelationship.findMany({
      where: {
        guardianIdentityId,
        status: {
          in: [
            EducationGuardianRelationshipStatus.ACTIVE,
            EducationGuardianRelationshipStatus.LIMITED,
          ],
        },
        effectiveFrom: { lte: now },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: now } }],
      },
      select: { studentProfileId: true, authorizedScope: true },
    });

    return links
      .filter((link) => {
        const scope = link.authorizedScope as GuardianAuthorizedScope;
        return (
          scope.viewDependentEnrollments === true ||
          scope.viewEnrollmentApplications === true ||
          scope.viewSchoolNotices === true ||
          scope.viewRequiredActions === true ||
          scope.viewEducationBenefits === true ||
          scope.viewAppointments === true
        );
      })
      .map((link) => link.studentProfileId);
  }

  async assertGuardianMayViewDependentEnrollments(
    guardianIdentityId: string,
    studentProfileId: string,
  ): Promise<void> {
    await this.assertStudentProfileAccess(guardianIdentityId, studentProfileId);
    const link = await this.prisma.educationGuardianRelationship.findFirst({
      where: { guardianIdentityId, studentProfileId },
    });
    if (!link) {
      throw new ForbiddenException('Guardian relationship required');
    }
    this.boundary.assertGuardianScope(
      link.authorizedScope as GuardianAuthorizedScope,
      'viewDependentEnrollments',
    );
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
      throw new ForbiddenException('Organization education access requires active membership');
    }

    const registry = await this.prisma.educationInstitutionRegistryRecord.findFirst({
      where: { organizationId },
    });
    if (!registry) {
      throw new ForbiddenException(
        'Organization is not represented as a registered education institution profile',
      );
    }
  }
}
