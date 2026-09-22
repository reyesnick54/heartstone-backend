import { Injectable } from '@nestjs/common';
import {
  ApplicationStatus,
  CaseCommunicationType,
  OfficialInstrumentStatus,
  PaymentIntentStatus,
  ServiceAppointmentStatus,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { ImmigrationExperienceBoundaryService } from '../../boundary/immigration-experience-boundary.service';
import { IMMIGRATION_SERVICE_PACK_ID } from '../../immigration.constants';
import { IMMIGRATION_GOVERNMENT_SERVICE_PACK } from '../../service-pack/immigration-government-service-pack.builder';
import {
  type CitizenImmigrationActionsResponseDto,
  type CitizenImmigrationApplicationsResponseDto,
  type CitizenImmigrationCredentialsResponseDto,
  type CitizenImmigrationOverviewResponseDto,
  type CitizenImmigrationStatusResponseDto,
} from '../dto/citizen-immigration-response.dto';
import { ImmigrationScopeService } from './immigration-scope.service';

@Injectable()
export class CitizenImmigrationProjectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ImmigrationScopeService,
    private readonly boundary: ImmigrationExperienceBoundaryService,
  ) {}

  async getOverview(identityId: string): Promise<CitizenImmigrationOverviewResponseDto> {
    return this.buildOverview(identityId);
  }

  async getStatus(identityId: string): Promise<CitizenImmigrationStatusResponseDto> {
    const caseWhere = await this.scope.buildCitizenCaseWhere(identityId);
    const cases = await this.prisma.case.findMany({
      where: caseWhere,
      include: { publicStatusProjection: true },
    });

    const statuses = cases.map((caseRecord) =>
      this.boundary.sanitizeCitizenPayload({
        verifiedStatusLabel:
          caseRecord.publicStatusProjection?.publicStatusLabel ?? 'Application in progress',
        publicMessage: caseRecord.publicStatusProjection?.publicMessage ?? undefined,
        disclaimer: this.boundary.disclaimer,
        externalSecurityCheckStatus: 'CLASSIFIED',
        externalCriminalCheckResult: 'RESTRICTED',
      }),
    );

    const caseIds = cases.map((c) => c.id);
    const [requestedInformationCount, appointments, fees, appeals] = await Promise.all([
      this.prisma.caseCommunication.count({
        where: {
          caseId: { in: caseIds },
          visibility: 'APPLICANT',
          communicationType: CaseCommunicationType.REQUEST_FOR_INFORMATION,
        },
      }),
      this.prisma.serviceAppointment.findMany({
        where: {
          caseId: { in: caseIds },
          status: {
            in: [
              ServiceAppointmentStatus.REQUESTED,
              ServiceAppointmentStatus.SCHEDULED,
              ServiceAppointmentStatus.CONFIRMED,
            ],
          },
        },
        include: { appointmentReason: true },
      }),
      this.prisma.paymentIntent.count({
        where: {
          invoice: { caseId: { in: caseIds } },
          status: { in: [PaymentIntentStatus.CREATED, PaymentIntentStatus.PENDING] },
        },
      }),
      this.prisma.redressMatter.count({
        where: {
          caseId: { in: caseIds },
          closedAt: null,
        },
      }),
    ]);

    const upcomingInterviewsCount = appointments.filter((a) => {
      const code = a.appointmentReason?.code;
      return typeof code === 'string' && code.includes('INTERVIEW');
    }).length;
    const upcomingBiometricsCount = appointments.filter((a) => {
      const code = a.appointmentReason?.code;
      return typeof code === 'string' && code.includes('BIOMETRIC');
    }).length;

    return {
      statuses,
      requestedInformationCount,
      upcomingInterviewsCount,
      upcomingBiometricsCount,
      outstandingFeesCount: fees,
      openAppealsCount: appeals,
    };
  }

  async listApplications(identityId: string): Promise<CitizenImmigrationApplicationsResponseDto> {
    const where = await this.scope.buildCitizenApplicationWhere(identityId);
    const applications = await this.prisma.application.findMany({
      where,
      include: {
        governmentService: true,
        case: { include: { publicStatusProjection: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return {
      items: applications.map((application) => ({
        applicationId: application.id,
        serviceName: application.governmentService.publicName,
        serviceCode: application.governmentService.code,
        statusLabel:
          application.case?.publicStatusProjection?.publicStatusLabel ??
          this.mapApplicationStatus(application.status),
        caseId: application.case?.id,
      })),
    };
  }

  async listCredentials(identityId: string): Promise<CitizenImmigrationCredentialsResponseDto> {
    const caseWhere = await this.scope.buildCitizenCaseWhere(identityId);
    const caseIds = (
      await this.prisma.case.findMany({ where: caseWhere, select: { id: true } })
    ).map((c) => c.id);

    const instruments = await this.prisma.officialInstrument.findMany({
      where: {
        OR: [{ holderIdentityId: identityId }, { caseId: { in: caseIds } }],
        case: { governmentService: this.scope.immigrationServiceWhere() },
        status: {
          in: [
            OfficialInstrumentStatus.ISSUED,
            OfficialInstrumentStatus.EFFECTIVE,
            OfficialInstrumentStatus.EXPIRED,
          ],
        },
      },
      include: {
        instrumentTypeVersion: { include: { instrumentTypeDefinition: true } },
        governmentDecision: { select: { id: true } },
      },
    });

    return {
      items: instruments.map((instrument) => ({
        credentialId: instrument.id,
        label:
          instrument.instrumentTypeVersion?.instrumentTypeDefinition.name ??
          'Immigration credential',
        status: instrument.status,
        effectiveUntil: instrument.effectiveUntil?.toISOString(),
        renewalEligible:
          instrument.status === OfficialInstrumentStatus.EFFECTIVE &&
          Boolean(instrument.governmentDecisionId),
      })),
    };
  }

  async listActions(identityId: string): Promise<CitizenImmigrationActionsResponseDto> {
    await this.scope.buildCitizenCaseWhere(identityId);

    const actions = [
      { actionKey: 'submit_evidence', label: 'Submit requested evidence', available: true },
      { actionKey: 'pay_fee', label: 'Pay outstanding fee', available: true },
      { actionKey: 'book_biometric', label: 'Schedule biometric appointment', available: true },
      {
        actionKey: 'set_immigration_status',
        label: 'Set immigration status',
        available: false,
      },
      {
        actionKey: 'self_issue_residence_permit',
        label: 'Issue residence permit',
        available: false,
      },
    ];

    for (const action of actions) {
      if (!action.available) {
        continue;
      }
      this.boundary.assertCitizenCannotMutateImmigrationStatus(action.actionKey);
    }

    return { items: actions.filter((a) => a.available) };
  }

  private async buildOverview(identityId: string): Promise<CitizenImmigrationOverviewResponseDto> {
    const [applications, credentials, actions] = await Promise.all([
      this.listApplications(identityId),
      this.listCredentials(identityId),
      this.listActions(identityId),
    ]);

    return {
      packId: IMMIGRATION_SERVICE_PACK_ID,
      packLabel: IMMIGRATION_GOVERNMENT_SERVICE_PACK.packLabel,
      disclaimer: this.boundary.disclaimer,
      activeApplicationsCount: applications.items.filter((item) => item.statusLabel !== 'Closed')
        .length,
      credentialsCount: credentials.items.length,
      pendingActionsCount: actions.items.length,
    };
  }

  private mapApplicationStatus(status: ApplicationStatus): string {
    switch (status) {
      case ApplicationStatus.SUBMITTED:
        return 'Submitted';
      case ApplicationStatus.RECEIVED:
        return 'Received';
      case ApplicationStatus.WITHDRAWN:
        return 'Withdrawn';
      case ApplicationStatus.CLOSED:
        return 'Closed';
      default:
        return 'In progress';
    }
  }
}
