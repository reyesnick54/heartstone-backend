import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { AcademicCredentialLifecycleStatus, EducationActorPersona } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { EducationBoundaryService } from '../common/education-boundary.service';
import { ACADEMIC_CREDENTIAL_REFERENCE_PREFIX } from '../education.constants';

@Injectable()
export class AcademicCredentialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: EducationBoundaryService,
  ) {}

  async registerGovernmentCredentialDraft(input: {
    studentEducationProfileId: string;
    actorPersona: EducationActorPersona;
    governmentDecisionId?: string;
    officialInstrumentId?: string;
  }) {
    this.boundary.assertTechnicalAdminCannotIssueAcademicCredential(input.actorPersona);

    const credentialReference = `${ACADEMIC_CREDENTIAL_REFERENCE_PREFIX}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const credential = await this.prisma.academicCredential.create({
      data: {
        id: randomUUID(),
        credentialReference,
        studentEducationProfileId: input.studentEducationProfileId,
        lifecycleStatus: AcademicCredentialLifecycleStatus.PENDING_ISSUANCE,
        governmentDecisionId: input.governmentDecisionId,
        officialInstrumentId: input.officialInstrumentId,
        academicRecordIsNotCredential: true,
      },
    });

    return credential;
  }
}
