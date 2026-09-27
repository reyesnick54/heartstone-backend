import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { StrategicProjectCoordinationType } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { S16_BOUNDARY_DISCLAIMERS } from '../../operational-lifecycle/operational-lifecycle.constants';

@Injectable()
export class StrategicProjectDossierService {
  constructor(private readonly prisma: PrismaService) {}

  async linkCase(profileId: string, caseId: string, linkRole = 'RELATED') {
    await this.assertProfile(profileId);
    return this.prisma.strategicProjectCaseLink.upsert({
      where: { profileId_caseId: { profileId, caseId } },
      create: { profileId, caseId, linkRole },
      update: { linkRole },
    });
  }

  async linkOrganization(
    profileId: string,
    organizationId: string,
    participationRole = 'PARTICIPANT',
  ) {
    await this.assertProfile(profileId);
    return this.prisma.strategicProjectOrganizationLink.upsert({
      where: { profileId_organizationId: { profileId, organizationId } },
      create: { profileId, organizationId, participationRole },
      update: { participationRole },
    });
  }

  async linkService(profileId: string, governmentServiceId: string) {
    await this.assertProfile(profileId);
    return this.prisma.strategicProjectServiceLink.upsert({
      where: { profileId_governmentServiceId: { profileId, governmentServiceId } },
      create: { profileId, governmentServiceId },
      update: {},
    });
  }

  async linkInstrument(profileId: string, officialInstrumentId: string) {
    await this.assertProfile(profileId);
    return this.prisma.strategicProjectInstrumentLink.upsert({
      where: { profileId_officialInstrumentId: { profileId, officialInstrumentId } },
      create: { profileId, officialInstrumentId },
      update: {},
    });
  }

  async linkReferral(profileId: string, caseReferralId: string) {
    await this.assertProfile(profileId);
    return this.prisma.strategicProjectReferralLink.upsert({
      where: { profileId_caseReferralId: { profileId, caseReferralId } },
      create: { profileId, caseReferralId },
      update: {},
    });
  }

  async setPrimaryInvestorOrganization(profileId: string, organizationId: string) {
    await this.assertProfile(profileId);
    return this.prisma.strategicProjectProfile.update({
      where: { id: profileId },
      data: { primaryInvestorOrganizationId: organizationId },
    });
  }

  async setCaseManagerAssignment(profileId: string, caseManagerAssignmentId: string) {
    await this.assertProfile(profileId);
    const assignment = await this.prisma.caseManagerAssignment.findUnique({
      where: { id: caseManagerAssignmentId },
    });
    if (!assignment) {
      throw new NotFoundException(`Case manager assignment ${caseManagerAssignmentId} not found`);
    }
    return this.prisma.strategicProjectProfile.update({
      where: { id: profileId },
      data: { currentCaseManagerAssignmentId: assignment.id },
    });
  }

  async recordInstitutionCoordination(input: {
    profileId: string;
    sourceInstitutionId: string;
    targetInstitutionId: string;
    sourceDepartmentId?: string;
    targetDepartmentId?: string;
    coordinationType: StrategicProjectCoordinationType;
    scopeSummary: string;
    caseReferralId?: string;
  }) {
    await this.assertProfile(input.profileId);
    if (input.sourceInstitutionId === input.targetInstitutionId) {
      throw new BadRequestException('Coordination requires distinct participating institutions');
    }

    return this.prisma.strategicProjectInstitutionCoordination.create({
      data: {
        ...input,
        doesNotExtendReceivingMandate: true,
      },
    });
  }

  async getDossier(profileId: string) {
    const profile = await this.prisma.strategicProjectProfile.findUnique({
      where: { id: profileId },
      include: {
        caseLinks: true,
        organizationLinks: true,
        serviceLinks: true,
        instrumentLinks: true,
        referralLinks: true,
        institutionCoordinations: true,
        milestones: true,
        dependencies: true,
        risks: true,
        currentCaseManagerAssignment: true,
        primaryInvestorOrganization: true,
        readinessEvidencePacket: true,
      },
    });
    if (!profile) {
      throw new NotFoundException(`StrategicProjectProfile ${profileId} not found`);
    }
    return {
      profile,
      boundaryDisclaimer: S16_BOUNDARY_DISCLAIMERS.coordinationNotMandateExtension,
    };
  }

  private async assertProfile(profileId: string) {
    const profile = await this.prisma.strategicProjectProfile.findUnique({
      where: { id: profileId },
    });
    if (!profile) {
      throw new NotFoundException(`StrategicProjectProfile ${profileId} not found`);
    }
    return profile;
  }
}
