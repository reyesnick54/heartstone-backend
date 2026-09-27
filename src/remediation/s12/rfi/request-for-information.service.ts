import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ApplicantInformationRequestStatus,
  CaseCommunicationChannel,
  CaseCommunicationType,
  CaseEventType,
  CaseRecipientType,
  Prisma,
} from '@prisma/client';

import { CaseEventsService } from '../../../application-processing/cases/case-events.service';
import { CaseCommunicationService } from '../../../application-processing/cases/timeline/case-communication.service';
import { PrismaService } from '../../../database/prisma.service';
import { SlaClockAuthorityService } from '../sla/sla-clock-authority.service';
import { SlaStandardResolverService } from '../sla/sla-standard-resolver.service';

export interface IssueRfiInput {
  caseId: string;
  applicationSubmissionId: string;
  requestedItems: unknown[];
  instructions: string;
  issuedByIdentityId: string;
  issuedByOfficeholderId?: string;
  functionAuthorityRecordId?: string;
  authorityEvaluationRecordId?: string;
  clockKey?: string;
}

export interface RecordRfiResponseInput {
  rfiId: string;
  actorIdentityId: string;
  satisfiesRequirements: boolean;
  override?: boolean;
  overrideAuthorityEvaluationRecordId?: string;
}

@Injectable()
export class RequestForInformationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly caseEvents: CaseEventsService,
    private readonly communications: CaseCommunicationService,
    private readonly slaClocks: SlaClockAuthorityService,
    private readonly standards: SlaStandardResolverService,
  ) {}

  async issueAuthorized(input: IssueRfiInput) {
    if (!input.functionAuthorityRecordId && !input.authorityEvaluationRecordId) {
      throw new ForbiddenException(
        'RFI requires recorded authority context; arbitrary users cannot pause SLA clocks',
      );
    }

    const caseRecord = await this.prisma.case.findUnique({ where: { id: input.caseId } });
    if (!caseRecord) {
      throw new NotFoundException('Case not found');
    }

    const clockKey = input.clockKey ?? 'PROCESSING';
    const standard = await this.standards.resolvePrimaryProcessingStandard(
      caseRecord.governmentServiceVersionId,
    );

    const rfi = await this.prisma.applicantInformationRequest.create({
      data: {
        applicationSubmissionId: input.applicationSubmissionId,
        caseId: input.caseId,
        requestedItems: input.requestedItems as Prisma.InputJsonValue,
        instructions: input.instructions,
        issuedByIdentityId: input.issuedByIdentityId,
        issuedByOfficeholderId: input.issuedByOfficeholderId,
        functionAuthorityRecordId: input.functionAuthorityRecordId,
        authorityEvaluationRecordId: input.authorityEvaluationRecordId,
        pausedClockKey: standard?.pauseOnRfi === false ? null : clockKey,
      },
    });

    if (standard?.pauseOnRfi !== false) {
      await this.slaClocks.pauseClock(input.caseId, clockKey, 'RFI issued under Protocol Article 31');
    }

    await this.caseEvents.record(
      input.caseId,
      CaseEventType.RFI_ISSUED,
      {
        rfiId: rfi.id,
        clockKey,
        requestedItems: input.requestedItems,
      },
      input.issuedByIdentityId,
    );

    await this.communications.create({
      caseId: input.caseId,
      communicationType: CaseCommunicationType.REQUEST_FOR_INFORMATION,
      senderIdentityId: input.issuedByIdentityId,
      senderOfficeholderId: input.issuedByOfficeholderId,
      recipientType: CaseRecipientType.APPLICANT,
      channel: CaseCommunicationChannel.PORTAL,
      subject: 'Request for information',
      body: input.instructions,
    });

    return rfi;
  }

  async recordResponse(input: RecordRfiResponseInput) {
    const rfi = await this.prisma.applicantInformationRequest.findUnique({
      where: { id: input.rfiId },
    });
    if (!rfi?.caseId) {
      throw new NotFoundException('RFI not found');
    }

    if (rfi.status !== ApplicantInformationRequestStatus.ISSUED) {
      return rfi;
    }

    const canResume =
      input.satisfiesRequirements ||
      (input.override && Boolean(input.overrideAuthorityEvaluationRecordId));

    if (!canResume) {
      throw new ForbiddenException('RFI response conditions not satisfied');
    }

    const updated = await this.prisma.applicantInformationRequest.update({
      where: { id: rfi.id },
      data: {
        status: ApplicantInformationRequestStatus.RESPONDED,
        respondedAt: new Date(),
        overrideResumedAt: input.override ? new Date() : undefined,
        overrideByIdentityId: input.override ? input.actorIdentityId : undefined,
        authorityEvaluationRecordId:
          input.overrideAuthorityEvaluationRecordId ?? rfi.authorityEvaluationRecordId,
      },
    });

    if (rfi.pausedClockKey) {
      await this.slaClocks.resumeClock(rfi.caseId, rfi.pausedClockKey);
    }

    await this.caseEvents.record(
      rfi.caseId,
      CaseEventType.APPLICANT_RESPONSE_RECEIVED,
      { rfiId: rfi.id, override: input.override ?? false },
      input.actorIdentityId,
    );

    return updated;
  }
}
