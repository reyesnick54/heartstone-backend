import { Injectable, NotFoundException } from '@nestjs/common';
import { RepresentativeAuthorityStatus } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { type SessionContextDto } from '../../../identity/auth/dto/session-context.dto';
import { type CitizenMeResponseDto } from '../dto/citizen-me-response.dto';

@Injectable()
export class CitizenMeService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(session: SessionContextDto): Promise<CitizenMeResponseDto> {
    const identity = await this.prisma.identity.findUnique({
      where: { id: session.identityId },
      include: {
        person: true,
        userAccount: true,
        memberships: {
          include: { organization: true },
          orderBy: [{ createdAt: 'asc' }],
        },
        representativeAuthorities: {
          include: { organization: true },
          orderBy: [{ effectiveFrom: 'desc' }, { id: 'asc' }],
        },
        communicationPreferences: {
          orderBy: [{ channelType: 'asc' }],
        },
        applications: {
          select: { applicantCategory: true },
          orderBy: [{ createdAt: 'desc' }],
          take: 20,
        },
      },
    });

    if (!identity) {
      throw new NotFoundException('Identity not found');
    }

    const now = new Date();
    const activeRepresentations = identity.representativeAuthorities.filter(
      (authority) =>
        authority.status === RepresentativeAuthorityStatus.ACTIVE &&
        authority.effectiveFrom <= now &&
        (!authority.effectiveUntil || authority.effectiveUntil > now),
    );

    const observedCategories = [
      ...new Set(identity.applications.map((application) => application.applicantCategory)),
    ];

    return {
      profile: {
        identityId: identity.id,
        displayName: identity.displayName,
        givenName: identity.person?.givenName,
        familyName: identity.person?.familyName,
      },
      classification: {
        observedApplicantCategories: observedCategories,
        classificationNote:
          'Citizen or resident classification is inferred from prior application categories and does not confer legal status.',
      },
      organizationRelationships: identity.memberships.map((membership) => ({
        organizationId: membership.organizationId,
        organizationName: membership.organization.name,
        membershipRole: membership.roleLabel ?? 'MEMBER',
        membershipStatus: membership.status,
      })),
      representationRelationships: activeRepresentations.map((authority) => ({
        representativeAuthorityId: authority.id,
        organizationId: authority.organizationId,
        organizationName: authority.organization.name,
        scopeDescription: authority.scopeDescription,
        status: authority.status,
        effectiveFrom: authority.effectiveFrom.toISOString(),
        effectiveUntil: authority.effectiveUntil?.toISOString(),
      })),
      accountAssurance: {
        assuranceLevel: session.assuranceLevel,
        accountStatus: identity.userAccount?.status ?? 'UNKNOWN',
        sessionId: session.sessionId,
        hasGovernmentAuthority: false,
        assuranceNote:
          'Authentication establishes identity only; it does not confer government decision authority.',
      },
      communicationPreferences: identity.communicationPreferences.map((preference) => ({
        channelType: preference.channelType,
        isEnabled: preference.isEnabled,
        locale: preference.locale ?? undefined,
      })),
      disclaimer: {
        label:
          'This profile summary is for citizen portal use only and excludes restricted internal records.',
        labelKey: 'citizen.me.disclaimer',
      },
    };
  }
}
