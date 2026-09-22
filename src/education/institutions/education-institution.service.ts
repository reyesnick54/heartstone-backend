import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import {
  EducationActorPersona,
  EducationInstitutionKind,
  EducationInstitutionRegistrationStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { EducationBoundaryService } from '../common/education-boundary.service';
import { EDUCATION_INSTITUTION_REFERENCE_PREFIX } from '../education.constants';

export interface RegisterEducationInstitutionInput {
  organizationId: string;
  jurisdictionId?: string;
  institutionKind: EducationInstitutionKind;
  masterAdministrativeFileId?: string;
  actorPersona?: EducationActorPersona;
}

@Injectable()
export class EducationInstitutionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: EducationBoundaryService,
  ) {}

  async registerInstitution(input: RegisterEducationInstitutionInput) {
    if (input.actorPersona) {
      this.boundary.assertInstitutionCannotSelfAccredit(
        input.actorPersona,
        'SELF_DECLARE_ACCREDITATION',
      );
    }

    const institutionReferenceNumber = `${EDUCATION_INSTITUTION_REFERENCE_PREFIX}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const institution = await this.prisma.educationInstitution.create({
      data: {
        id: randomUUID(),
        institutionReferenceNumber,
        organizationId: input.organizationId,
        jurisdictionId: input.jurisdictionId,
        institutionKind: input.institutionKind,
        masterAdministrativeFileId: input.masterAdministrativeFileId,
        doesNotSelfAccredit: true,
      },
    });

    return { institution, accreditationsCreated: 0 };
  }

  async submitRegistration(input: {
    educationInstitutionId: string;
    applicationId?: string;
    caseId?: string;
    actorPersona?: EducationActorPersona;
  }) {
    if (input.actorPersona) {
      this.boundary.assertInstitutionCannotSelfAccredit(input.actorPersona, 'SELF_MARK_ACCREDITED');
    }

    const registrationReference = `${EDUCATION_INSTITUTION_REFERENCE_PREFIX}-REG-${randomUUID().slice(0, 8).toUpperCase()}`;
    const registration = await this.prisma.educationInstitutionRegistration.create({
      data: {
        id: randomUUID(),
        educationInstitutionId: input.educationInstitutionId,
        registrationReference,
        status: EducationInstitutionRegistrationStatus.SUBMITTED,
        registrationDoesNotAccredit: true,
        applicationId: input.applicationId,
        caseId: input.caseId,
      },
    });

    this.boundary.assertRegistrationDoesNotCreateAccreditation({
      registrationDoesNotAccredit: registration.registrationDoesNotAccredit,
      accreditationsCreated: 0,
    });

    return { registration, accreditationsCreated: 0 };
  }
}
