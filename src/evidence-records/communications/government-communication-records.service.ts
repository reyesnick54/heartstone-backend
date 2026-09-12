import { Injectable } from '@nestjs/common';
import { CaseCommunicationChannel } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { generateEvidenceReferenceNumber } from '../common/reference-number.util';
import { GOVERNMENT_COMMUNICATION_REFERENCE_PREFIX } from '../evidence-records.constants';

@Injectable()
export class GovernmentCommunicationRecordsService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: {
    masterAdministrativeFileId: string;
    caseCommunicationId?: string;
    channel: CaseCommunicationChannel;
    subject?: string;
    body: string;
  }) {
    const record = await this.prisma.governmentCommunicationRecord.create({
      data: {
        communicationReference: generateEvidenceReferenceNumber(
          GOVERNMENT_COMMUNICATION_REFERENCE_PREFIX,
        ),
        masterAdministrativeFileId: input.masterAdministrativeFileId,
        caseCommunicationId: input.caseCommunicationId,
        channel: input.channel,
        subject: input.subject,
        body: input.body,
        receivedAt: new Date(),
      },
    });

    return {
      ...record,
      mutatesCaseStatus: false,
    };
  }
}
