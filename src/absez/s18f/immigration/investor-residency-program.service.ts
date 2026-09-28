import { randomUUID } from 'node:crypto';

import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  ImmigrationActorPersona,
  ImmigrationCredentialLifecycleStatus,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { ImmigrationApplicationProfileService } from '../../../immigration/applications/immigration-application-profile.service';
import { ImmigrationBoundaryService } from '../../../immigration/common/immigration-boundary.service';
import {
  INVESTOR_RESIDENCY_PROGRAM_CODE_PREFIX,
  S18F_BOUNDARY_DISCLAIMERS,
} from '../absez-s18f.constants';

@Injectable()
export class InvestorResidencyProgramService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly immigrationBoundary: ImmigrationBoundaryService,
    private readonly immigrationApplications: ImmigrationApplicationProfileService,
  ) {}

  async configureProgram(input: {
    programCode: string;
    programLabel: string;
    institutionId?: string;
    governingSourceId?: string;
    configurationPayload?: Record<string, unknown>;
  }) {
    return this.prisma.immigrationProgramConfiguration.upsert({
      where: { programCode: input.programCode },
      create: {
        id: randomUUID(),
        programCode: input.programCode,
        programLabel: input.programLabel,
        institutionId: input.institutionId,
        governingSourceId: input.governingSourceId,
        configurationPayload: (input.configurationPayload ?? {}) as Prisma.InputJsonValue,
        doesNotGrantResidencyOrCitizenship: true,
      },
      update: {
        programLabel: input.programLabel,
        institutionId: input.institutionId,
        governingSourceId: input.governingSourceId,
        configurationPayload: (input.configurationPayload ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  async openInvestorResidencyApplication(input: {
    programCode: string;
    immigrationProfileId: string;
    caseId: string;
    applicationId: string;
    organizationId?: string;
    strategicProjectProfileId?: string;
  }) {
    const program = await this.prisma.immigrationProgramConfiguration.findUniqueOrThrow({
      where: { programCode: input.programCode },
    });

    const { profile: residencyProfile } =
      await this.immigrationApplications.linkResidencyApplicationProfile({
        immigrationProfileId: input.immigrationProfileId,
        caseId: input.caseId,
        applicationId: input.applicationId,
        residencyProgramCode: program.programCode,
      });

    const applicationReference = `${INVESTOR_RESIDENCY_PROGRAM_CODE_PREFIX}-${randomUUID().slice(0, 8).toUpperCase()}`;

    return this.prisma.investorResidencyProgramApplication.create({
      data: {
        id: randomUUID(),
        applicationReference,
        immigrationProgramConfigurationId: program.id,
        immigrationProfileId: input.immigrationProfileId,
        residencyApplicationProfileId: residencyProfile.id,
        organizationId: input.organizationId,
        strategicProjectProfileId: input.strategicProjectProfileId,
        caseId: input.caseId,
        applicationId: input.applicationId,
        paymentDoesNotGrantResidency: true,
      },
      include: { residencyApplicationProfile: true, immigrationProgramConfiguration: true },
    });
  }

  async recordInvestmentPayment(actorPersona: ImmigrationActorPersona, applicationId: string) {
    this.immigrationBoundary.assertPaymentDoesNotApproveImmigrationCase(actorPersona);
    const application = await this.prisma.investorResidencyProgramApplication.findUniqueOrThrow({
      where: { id: applicationId },
    });
    if (!application.paymentDoesNotGrantResidency) {
      throw new ForbiddenException(S18F_BOUNDARY_DISCLAIMERS.paymentNotResidency);
    }
    const permitCount = await this.prisma.residencyPermitRecord.count({
      where: {
        immigrationProfileId: application.immigrationProfileId,
        lifecycleStatus: ImmigrationCredentialLifecycleStatus.ISSUED,
      },
    });
    return {
      application,
      residencyPermitsIssued: permitCount,
      paymentRecordedDoesNotGrantResidency: true,
      disclaimer: S18F_BOUNDARY_DISCLAIMERS.paymentNotResidency,
    };
  }
}
