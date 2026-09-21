import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { type ResolvedActorContext } from './actor-context.service';

@Injectable()
export class CaseAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async assertApplicantAccess(caseId: string, applicantIdentityId: string): Promise<void> {
    const caseRecord = await this.prisma.case.findUnique({
      where: { id: caseId },
      select: { applicantIdentityId: true },
    });

    if (!caseRecord) {
      throw new NotFoundException(`Case "${caseId}" was not found`);
    }

    if (caseRecord.applicantIdentityId !== applicantIdentityId) {
      throw new ForbiddenException('Case is not accessible to this identity');
    }
  }

  async assertOfficialInstitutionalAccess(
    caseId: string,
    actor: ResolvedActorContext,
  ): Promise<void> {
    const caseRecord = await this.prisma.case.findUnique({
      where: { id: caseId },
      select: { responsibleInstitutionId: true },
    });

    if (!caseRecord) {
      throw new NotFoundException(`Case "${caseId}" was not found`);
    }

    if (!actor.hasActiveOfficeholderLink) {
      throw new ForbiddenException(
        'Institutional case access requires an active officeholder link',
      );
    }

    if (!actor.linkedInstitutionIds.includes(caseRecord.responsibleInstitutionId)) {
      throw new ForbiddenException('Case is outside the authenticated actor institution scope');
    }
  }

  async assertApplicantOrOfficialAccess(
    caseId: string,
    actor: ResolvedActorContext,
  ): Promise<'APPLICANT' | 'OFFICIAL'> {
    const caseRecord = await this.prisma.case.findUnique({
      where: { id: caseId },
      select: { applicantIdentityId: true, responsibleInstitutionId: true },
    });

    if (!caseRecord) {
      throw new NotFoundException(`Case "${caseId}" was not found`);
    }

    if (caseRecord.applicantIdentityId === actor.identityId) {
      return 'APPLICANT';
    }

    if (
      actor.hasActiveOfficeholderLink &&
      actor.linkedInstitutionIds.includes(caseRecord.responsibleInstitutionId)
    ) {
      return 'OFFICIAL';
    }

    throw new ForbiddenException('Case is not accessible to this identity');
  }
}
