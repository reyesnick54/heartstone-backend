import { Injectable } from '@nestjs/common';
import { MasterAdministrativeFileSectionType } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import type { MasterFileIndexReference } from '../../records/master-administrative-file-index.service';

@Injectable()
export class MafIndexingService {
  constructor(private readonly prisma: PrismaService) {}

  async indexFinancialRecords(masterAdministrativeFileId: string): Promise<MasterFileIndexReference[]> {
    const [assessments, invoices, refundRequests] = await Promise.all([
      this.prisma.feeAssessment.findMany({
        where: { masterAdministrativeFileId },
        orderBy: { calculatedAt: 'asc' },
      }),
      this.prisma.invoice.findMany({
        where: { masterAdministrativeFileId },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.refundRequest.findMany({
        where: {
          paymentTransaction: {
            paymentIntent: {
              invoice: { masterAdministrativeFileId },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const references: MasterFileIndexReference[] = [];

    for (const assessment of assessments) {
      references.push({
        referenceType: 'FeeAssessment',
        referenceId: assessment.id,
        label: assessment.assessmentReference,
        occurredAt: assessment.calculatedAt.toISOString(),
        metadata: {
          status: assessment.status,
          totalAmountCents: assessment.totalAmountCents,
          section: MasterAdministrativeFileSectionType.FEES_AND_FINANCIAL_RECORDS,
        },
      });
    }

    for (const invoice of invoices) {
      references.push({
        referenceType: 'Invoice',
        referenceId: invoice.id,
        label: invoice.invoiceNumber,
        occurredAt: (invoice.issuedAt ?? invoice.createdAt).toISOString(),
        metadata: {
          status: invoice.status,
          totalAmountCents: invoice.totalAmountCents,
          section: MasterAdministrativeFileSectionType.FEES_AND_FINANCIAL_RECORDS,
        },
      });
    }

    for (const refundRequest of refundRequests) {
      references.push({
        referenceType: 'RefundRequest',
        referenceId: refundRequest.id,
        label: refundRequest.id,
        occurredAt: refundRequest.createdAt.toISOString(),
        metadata: {
          status: refundRequest.status,
          requestedAmountCents: refundRequest.requestedAmountCents,
          section: MasterAdministrativeFileSectionType.FEES_AND_FINANCIAL_RECORDS,
        },
      });
    }

    return references.sort((left, right) =>
      (left.occurredAt ?? '').localeCompare(right.occurredAt ?? ''),
    );
  }

  async indexCommunicationRecords(
    masterAdministrativeFileId: string,
  ): Promise<MasterFileIndexReference[]> {
    const messages = await this.prisma.communicationMessage.findMany({
      where: { masterAdministrativeFileId },
      orderBy: { createdAt: 'asc' },
    });

    return messages.map((message) => ({
      referenceType: 'CommunicationMessage',
      referenceId: message.id,
      label: message.messageReference,
      occurredAt: (message.approvedAt ?? message.createdAt).toISOString(),
      metadata: {
        status: message.status,
        channelType: message.channelType,
        decisionNoticeReference: message.decisionNoticeReference,
        section: MasterAdministrativeFileSectionType.COMMUNICATIONS_AND_NOTICES,
      },
    }));
  }

  async indexIntegrationRecords(
    masterAdministrativeFileId: string,
  ): Promise<MasterFileIndexReference[]> {
    const requests = await this.prisma.integrationRequest.findMany({
      where: { masterAdministrativeFileId },
      orderBy: { initiatedAt: 'asc' },
    });

    return requests.map((request) => ({
      referenceType: 'IntegrationRequest',
      referenceId: request.id,
      label: request.requestReference,
      occurredAt: request.initiatedAt.toISOString(),
      metadata: {
        status: request.status,
        section: MasterAdministrativeFileSectionType.COMMUNICATIONS_AND_NOTICES,
      },
    }));
  }

  async buildOperationalSupportIndex(masterAdministrativeFileId: string): Promise<{
    section14: MasterFileIndexReference[];
    section15: MasterFileIndexReference[];
  }> {
    const [financial, communications, integrations] = await Promise.all([
      this.indexFinancialRecords(masterAdministrativeFileId),
      this.indexCommunicationRecords(masterAdministrativeFileId),
      this.indexIntegrationRecords(masterAdministrativeFileId),
    ]);

    return {
      section14: financial,
      section15: [...communications, ...integrations].sort((left, right) =>
        (left.occurredAt ?? '').localeCompare(right.occurredAt ?? ''),
      ),
    };
  }
}
