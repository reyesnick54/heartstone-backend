import { Injectable, NotFoundException } from '@nestjs/common';
import { DelegationStatus, IdentityOfficeholderLinkStatus, IdentityType } from '@prisma/client';

import { isEffectiveAt } from '../../../authority/common/effective-period.util';
import { PrismaService } from '../../../database/prisma.service';
import { isAppointmentCurrent } from '../../../government/common/appointment-current.util';
import {
  OFFICIAL_AUTHORITY_DISCLAIMER,
  TECHNICAL_ADMIN_ROLE_MARKER,
} from '../official-experience.constants';
import {
  type OfficialAppointmentContext,
  type OfficialDelegationContext,
  type OfficialOfficeholderLinkContext,
  type OfficialScope,
  type ResolvedOfficialContext,
} from '../types/official-context.types';

@Injectable()
export class OfficialContextService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveContext(
    identityId: string,
    assuranceLevel: string,
    technicalRoleMarker?: string,
  ): Promise<ResolvedOfficialContext> {
    const identity = await this.prisma.identity.findUnique({
      where: { id: identityId },
      include: {
        userAccount: true,
        officeholderLinks: {
          where: { status: IdentityOfficeholderLinkStatus.ACTIVE },
          include: { officeholder: true },
        },
      },
    });

    if (!identity) {
      throw new NotFoundException(`Identity "${identityId}" was not found`);
    }

    const officeholderIds = identity.officeholderLinks.map((link) => link.officeholderId);

    const officeholderLinks: OfficialOfficeholderLinkContext[] = identity.officeholderLinks.map(
      (link) => ({
        linkId: link.id,
        officeholderId: link.officeholderId,
        officeholderName: link.officeholder.name,
        officeholderCode: link.officeholder.code,
        status: link.status,
      }),
    );

    const appointmentsRaw =
      officeholderIds.length > 0
        ? await this.prisma.appointment.findMany({
            where: { officeholderId: { in: officeholderIds } },
            include: {
              office: { include: { department: { include: { institution: true } } } },
            },
          })
        : [];

    const activeAppointments: OfficialAppointmentContext[] = appointmentsRaw
      .filter((appointment) => isAppointmentCurrent(appointment))
      .map((appointment) => ({
        appointmentId: appointment.id,
        officeholderId: appointment.officeholderId,
        officeId: appointment.officeId,
        officeName: appointment.office.name,
        officeCode: appointment.office.code,
        departmentId: appointment.office.departmentId,
        departmentName: appointment.office.department.name,
        departmentCode: appointment.office.department.code,
        institutionId: appointment.office.department.institutionId,
        institutionName: appointment.office.department.institution.name,
        institutionCode: appointment.office.department.institution.code,
        status: appointment.status,
        effectiveFrom: appointment.effectiveFrom.toISOString(),
        effectiveUntil: appointment.effectiveUntil?.toISOString() ?? null,
      }));

    const institutionIds = [...new Set(activeAppointments.map((a) => a.institutionId))];
    const departmentIds = [...new Set(activeAppointments.map((a) => a.departmentId))];
    const officeIds = [...new Set(activeAppointments.map((a) => a.officeId))];

    const jurisdictions =
      institutionIds.length > 0
        ? await this.prisma.institution.findMany({
            where: { id: { in: institutionIds } },
            select: { jurisdictionId: true },
          })
        : [];
    const jurisdictionIds = [...new Set(jurisdictions.map((j) => j.jurisdictionId))];

    const now = new Date();
    const delegationsRaw =
      officeholderIds.length > 0
        ? await this.prisma.delegation.findMany({
            where: {
              status: DelegationStatus.ACTIVE,
              recipientOfficeholderId: { in: officeholderIds },
            },
            include: { institution: true },
          })
        : [];

    const activeDelegations: OfficialDelegationContext[] = delegationsRaw
      .filter((delegation) =>
        isEffectiveAt(
          { effectiveFrom: delegation.effectiveFrom, effectiveUntil: delegation.effectiveUntil },
          now,
        ),
      )
      .map((delegation) => ({
        delegationId: delegation.id,
        institutionId: delegation.institutionId,
        institutionName: delegation.institution.name,
        scopeDescription: delegation.scopeDescription,
        status: delegation.status,
        effectiveFrom: delegation.effectiveFrom.toISOString(),
        effectiveUntil: delegation.effectiveUntil?.toISOString() ?? null,
        recipientOfficeholderId: delegation.recipientOfficeholderId,
        recipientOfficeId: delegation.recipientOfficeId,
      }));

    const isServiceIdentity = identity.type === IdentityType.SERVICE;
    const hasOfficeholderLink = officeholderLinks.length > 0;
    const hasActiveAppointment = activeAppointments.length > 0;
    const isTechnicalAdminOnly =
      technicalRoleMarker === TECHNICAL_ADMIN_ROLE_MARKER && !hasActiveAppointment;

    const substantiveAccessAllowed =
      !isServiceIdentity && hasOfficeholderLink && hasActiveAppointment && !isTechnicalAdminOnly;

    const scope: OfficialScope = {
      identityId,
      officeholderIds,
      institutionIds,
      departmentIds,
      officeIds,
      appointmentIds: activeAppointments.map((a) => a.appointmentId),
      activeDelegations,
      primaryAppointment: activeAppointments[0] ?? null,
    };

    return {
      identityId: identity.id,
      identityType: identity.type,
      displayName: identity.displayName,
      assuranceLevel,
      userAccountId: identity.userAccountId,
      officeholderLinks,
      activeAppointments,
      activeDelegations,
      institutionalContext: {
        institutionIds,
        departmentIds,
        officeIds,
        jurisdictionIds,
      },
      technicalCapabilities: {
        canAccessOfficialWorkspace: hasOfficeholderLink && !isServiceIdentity,
        hasActiveAppointment,
        hasOfficeholderLink,
        substantiveAccessAllowed,
        isServiceIdentity,
        isTechnicalAdminOnly,
      },
      authorityDisclaimer: OFFICIAL_AUTHORITY_DISCLAIMER,
      scope,
    };
  }
}
