import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Application, MembershipStatus, RepresentativeAuthorityStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ApplicationAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async assertCanAccess(applicationId: string, identityId: string): Promise<Application> {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException(`Application "${applicationId}" was not found`);
    }

    if (application.applicantIdentityId === identityId) {
      return application;
    }

    if (application.representativeAuthorityId) {
      const authority = await this.prisma.representativeAuthority.findUnique({
        where: { id: application.representativeAuthorityId },
      });

      if (
        authority &&
        authority.identityId === identityId &&
        authority.status === RepresentativeAuthorityStatus.ACTIVE
      ) {
        return application;
      }
    }

    if (application.organizationId) {
      const membership = await this.prisma.organizationMembership.findFirst({
        where: {
          organizationId: application.organizationId,
          identityId,
          status: MembershipStatus.ACTIVE,
        },
      });

      if (membership) {
        return application;
      }
    }

    throw new ForbiddenException('You are not authorized to access this application');
  }

  async validateOrganizationAccess(
    identityId: string,
    organizationId: string,
    representativeAuthorityId?: string,
  ): Promise<void> {
    if (representativeAuthorityId) {
      const authority = await this.prisma.representativeAuthority.findUnique({
        where: { id: representativeAuthorityId },
      });

      if (
        !authority ||
        authority.identityId !== identityId ||
        authority.organizationId !== organizationId ||
        authority.status !== RepresentativeAuthorityStatus.ACTIVE
      ) {
        throw new ForbiddenException(
          'Representative authority does not grant access to the specified organization',
        );
      }

      return;
    }

    const membership = await this.prisma.organizationMembership.findFirst({
      where: {
        organizationId,
        identityId,
        status: MembershipStatus.ACTIVE,
      },
    });

    if (!membership) {
      throw new ForbiddenException(
        'You are not authorized to file applications for the specified organization',
      );
    }
  }

  async validateRepresentativeAuthority(
    identityId: string,
    representativeAuthorityId: string,
  ): Promise<{ organizationId: string }> {
    const authority = await this.prisma.representativeAuthority.findUnique({
      where: { id: representativeAuthorityId },
    });

    if (!authority) {
      throw new NotFoundException(
        `Representative authority "${representativeAuthorityId}" was not found`,
      );
    }

    if (authority.identityId !== identityId) {
      throw new ForbiddenException('Representative authority does not belong to the current actor');
    }

    if (authority.status !== RepresentativeAuthorityStatus.ACTIVE) {
      throw new ForbiddenException('Representative authority is not active');
    }

    const now = new Date();
    if (authority.effectiveFrom > now) {
      throw new ForbiddenException('Representative authority is not yet effective');
    }

    if (authority.effectiveUntil && authority.effectiveUntil < now) {
      throw new ForbiddenException('Representative authority has expired');
    }

    return { organizationId: authority.organizationId };
  }
}
