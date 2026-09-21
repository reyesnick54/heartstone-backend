import { Injectable } from '@nestjs/common';
import { CaseEventPublicVisibility } from '@prisma/client';

import { CasesService } from '../../../application-processing/cases/cases.service';
import { type SessionContextDto } from '../../../identity/auth/dto/session-context.dto';
import { PrismaService } from '../../../database/prisma.service';
import { CitizenAccessService } from '../../common/citizen-access.service';
import { type CitizenCaseStatusResponseDto } from '../dto/citizen-case-status-response.dto';
import { mapInstitutionAttribution } from '../mappers/citizen-attribution.mapper';

@Injectable()
export class CitizenCaseStatusService {
  constructor(
    private readonly casesService: CasesService,
    private readonly access: CitizenAccessService,
    private readonly prisma: PrismaService,
  ) {}

  async getCaseStatus(
    session: SessionContextDto,
    caseId: string,
  ): Promise<CitizenCaseStatusResponseDto> {
    await this.access.assertCaseAccess(caseId, session.identityId);

    const applicantView = await this.casesService.getApplicantStatus(session, caseId);

    const caseRecord = await this.prisma.case.findUniqueOrThrow({
      where: { id: caseId },
      include: {
        governmentService: {
          include: {
            responsibleInstitution: true,
            responsibleDepartment: true,
          },
        },
        communications: {
          where: {
            OR: [{ visibility: 'APPLICANT' }, { publicVisibility: 'APPLICANT_VISIBLE' }],
          },
          orderBy: [{ sentAt: 'desc' }, { createdAt: 'desc' }],
          take: 5,
        },
      },
    });

    const projection = applicantView.publicStatus;

    return {
      caseId,
      caseNumber: applicantView.caseNumber,
      publicStatusLabel: projection?.publicStatusLabel ?? 'Application in progress',
      publicStageLabel: projection?.publicStageLabel ?? 'Application in progress',
      publicMessage: projection?.publicMessage ?? undefined,
      applicantDisclaimer: {
        label:
          projection?.applicantDisclaimer ??
          'This status is informational only and does not constitute a government decision or approval.',
        labelKey: 'citizen.case.applicant_disclaimer',
      },
      attribution: mapInstitutionAttribution(caseRecord),
      milestones: applicantView.milestones.map((milestone) => ({
        milestoneId: milestone.id,
        name: milestone.name,
        status: milestone.status,
        reachedAt: milestone.reachedAt?.toISOString(),
      })),
      recentCommunications: caseRecord.communications
        .filter(
          (communication) =>
            communication.publicVisibility === CaseEventPublicVisibility.APPLICANT_VISIBLE ||
            communication.visibility === 'APPLICANT',
        )
        .map((communication) => ({
          communicationId: communication.id,
          communicationType: communication.communicationType ?? 'STATUS_UPDATE',
          subject: communication.subject ?? undefined,
          sentAt: (communication.sentAt ?? communication.createdAt).toISOString(),
        })),
      deepLink: {
        route: 'citizen.case.status',
        params: { caseId },
      },
    };
  }
}
