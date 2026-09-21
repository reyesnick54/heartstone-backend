import { Injectable } from '@nestjs/common';
import { CaseCommunicationType, CaseEventPublicVisibility } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { mapInstitutionAttribution } from '../../citizen/mappers/citizen-attribution.mapper';
import { BusinessAccessService } from '../../common/business-access.service';
import { type PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { type BusinessMessagesResponseDto } from '../dto/business-message.dto';

@Injectable()
export class BusinessMessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: BusinessAccessService,
  ) {}

  async listMessages(
    identityId: string,
    organizationId: string,
    query: PaginationQueryDto,
  ): Promise<BusinessMessagesResponseDto> {
    const orgAccess = await this.access.assertOrganizationAccess(organizationId, identityId);
    const caseWhere = this.access.buildCaseWhere(orgAccess);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const applicantVisibleTypes: CaseCommunicationType[] = [
      CaseCommunicationType.DEFICIENCY_NOTICE,
      CaseCommunicationType.REQUEST_FOR_INFORMATION,
      CaseCommunicationType.STATUS_UPDATE,
      CaseCommunicationType.SYSTEM_NOTICE,
    ];

    const where = {
      case: caseWhere,
      publicVisibility: CaseEventPublicVisibility.APPLICANT_VISIBLE,
      deliveryStatus: 'SENT' as const,
      communicationType: { in: applicantVisibleTypes },
    };

    const [totalItems, communications] = await Promise.all([
      this.prisma.caseCommunication.count({ where }),
      this.prisma.caseCommunication.findMany({
        where,
        include: {
          case: {
            include: {
              governmentService: {
                include: { responsibleInstitution: true, responsibleDepartment: true },
              },
            },
          },
        },
        orderBy: [{ sentAt: 'desc' }, { createdAt: 'desc' }, { id: 'asc' }],
        skip,
        take: pageSize,
      }),
    ]);

    return {
      items: communications.map((communication) => ({
        communicationId: communication.id,
        communicationType: communication.communicationType ?? 'STATUS_UPDATE',
        subject: communication.subject,
        sentAt: (communication.sentAt ?? communication.createdAt).toISOString(),
        caseId: communication.caseId,
        attribution: mapInstitutionAttribution(communication.case),
      })),
      pagination: this.access.buildPaginationMeta(page, pageSize, totalItems),
      disclaimer: {
        label:
          'Government messages exclude internal officer notes, restricted evidence, and security-sensitive content.',
        labelKey: 'business.messages.disclaimer',
      },
    };
  }
}
