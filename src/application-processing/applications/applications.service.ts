import {
  ConflictException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ApplicantCategory,
  ApplicationStatus,
  ApplicationSubmissionStatus,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { FormResponseValidationService } from '../../service-catalog/forms/form-response-validation.service';
import {
  APPLICATION_NUMBER_PREFIX,
  SUBMISSION_NUMBER_PREFIX,
} from '../application-processing.constants';
import { CasesService } from '../cases/cases.service';
import { ApplicationProcessingValidationService } from '../common/application-processing-validation.service';
import {
  DuplicateSubmissionException,
  ImmutableSubmissionException,
  ServiceNotStartableException,
} from '../common/exceptions/application-processing.exceptions';
import { generateReferenceNumber } from '../common/reference-number.util';
import { hashSubmissionContent } from '../common/submission-hash.util';
import { CreateApplicationDto } from './dto/create-application.dto';
import { SubmitApplicationDto } from './dto/submit-application.dto';
import { UpdateApplicationDraftDto } from './dto/update-application-draft.dto';

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validation: ApplicationProcessingValidationService,
    private readonly formValidation: FormResponseValidationService,
    @Inject(forwardRef(() => CasesService))
    private readonly casesService: CasesService,
  ) {}

  async createDraft(applicantIdentityId: string, dto: CreateApplicationDto) {
    await this.validation.assertServiceStartable(dto.governmentServiceVersionId);

    const serviceVersion = await this.prisma.governmentServiceVersion.findUnique({
      where: { id: dto.governmentServiceVersionId },
      include: { governmentService: true },
    });

    if (!serviceVersion) {
      throw new NotFoundException('Government service version not found');
    }

    await this.validation.assertFormVersionValid(
      dto.formVersionId,
      serviceVersion.formVersionId ?? dto.formVersionId,
    );
    this.validation.assertConfigurationFingerprint(
      dto.configurationFingerprint,
      dto.configurationFingerprint,
    );
    await this.validation.assertApplicantCategoryAllowed(
      dto.governmentServiceVersionId,
      dto.applicantCategory,
    );

    if (dto.applicantCategory === ApplicantCategory.AUTHORIZED_REPRESENTATIVE) {
      if (!dto.organizationId || !dto.representativeAuthorityId) {
        throw new ServiceNotStartableException(
          'Organization and representative authority are required for authorized representative applications',
        );
      }
      await this.validation.assertRepresentativeAuthority(
        dto.representativeAuthorityId,
        applicantIdentityId,
        dto.organizationId,
      );
    } else if (dto.organizationId) {
      throw new ForbiddenException(
        'Applicant cannot submit as arbitrary organization without representative authority',
      );
    }

    return this.prisma.application.create({
      data: {
        applicantIdentityId,
        organizationId: dto.organizationId,
        representativeAuthorityId: dto.representativeAuthorityId,
        governmentServiceId: serviceVersion.governmentServiceId,
        governmentServiceVersionId: dto.governmentServiceVersionId,
        formDefinitionId: dto.formDefinitionId,
        formVersionId: dto.formVersionId,
        configurationFingerprint: dto.configurationFingerprint,
        applicantCategory: dto.applicantCategory,
        draftAnswers: (dto.draftAnswers ?? {}) as Prisma.InputJsonValue,
        status: ApplicationStatus.DRAFT,
      },
    });
  }

  async updateDraft(
    applicationId: string,
    applicantIdentityId: string,
    dto: UpdateApplicationDraftDto,
  ) {
    const application = await this.findOwnedApplication(applicationId, applicantIdentityId);

    if (application.status !== ApplicationStatus.DRAFT) {
      throw new ImmutableSubmissionException('Only draft applications can be updated');
    }

    return this.prisma.application.update({
      where: { id: applicationId },
      data: { draftAnswers: dto.draftAnswers as Prisma.InputJsonValue },
    });
  }

  async submit(applicationId: string, applicantIdentityId: string, dto: SubmitApplicationDto) {
    const application = await this.findOwnedApplication(applicationId, applicantIdentityId);

    if (application.status !== ApplicationStatus.DRAFT) {
      throw new ImmutableSubmissionException();
    }

    if (dto.idempotencyKey) {
      const existing = await this.prisma.application.findFirst({
        where: { applicantIdentityId, idempotencyKey: dto.idempotencyKey },
        include: { submissions: true },
      });
      if (existing && existing.id !== applicationId && existing.submissions.length > 0) {
        throw new DuplicateSubmissionException();
      }
    }

    await this.validation.assertServiceStartable(application.governmentServiceVersionId);
    await this.validation.assertFormVersionValid(
      application.formVersionId,
      application.formVersionId,
    );
    this.validation.assertConfigurationFingerprint(
      dto.configurationFingerprint,
      application.configurationFingerprint,
    );

    const validation = await this.formValidation.validateResponse(
      application.formVersionId,
      dto.answers,
    );
    if (validation.outcome !== 'VALID') {
      throw new ConflictException({
        message: 'Form response validation failed',
        errors: validation.fieldErrors,
        missingRequiredFields: validation.missingRequiredFields,
      });
    }

    const contentHash = hashSubmissionContent({
      answers: dto.answers,
      formVersionId: application.formVersionId,
      governmentServiceVersionId: application.governmentServiceVersionId,
      configurationFingerprint: application.configurationFingerprint,
    });

    const sequenceNumber =
      (await this.prisma.applicationSubmission.count({ where: { applicationId } })) + 1;

    const applicationNumber =
      application.applicationNumber ?? generateReferenceNumber(APPLICATION_NUMBER_PREFIX);

    const submission = await this.prisma.$transaction(async (tx) => {
      const createdSubmission = await tx.applicationSubmission.create({
        data: {
          applicationId,
          submissionNumber: generateReferenceNumber(SUBMISSION_NUMBER_PREFIX),
          sequenceNumber,
          answersSnapshot: dto.answers as Prisma.InputJsonValue,
          configurationFingerprint: application.configurationFingerprint,
          governmentServiceVersionId: application.governmentServiceVersionId,
          formVersionId: application.formVersionId,
          contentHash,
          status: ApplicationSubmissionStatus.SUBMITTED,
        },
      });

      const acknowledgmentReference = `ACK-${createdSubmission.submissionNumber}`;
      const acknowledged = await tx.applicationSubmission.update({
        where: { id: createdSubmission.id },
        data: {
          status: ApplicationSubmissionStatus.ACKNOWLEDGED,
          acknowledgedAt: new Date(),
          acknowledgmentReference,
        },
      });

      await tx.application.update({
        where: { id: applicationId },
        data: {
          status: ApplicationStatus.SUBMITTED,
          applicationNumber,
          idempotencyKey: dto.idempotencyKey,
        },
      });

      return acknowledged;
    });

    const caseRecord = await this.casesService.createFromSubmission(application, submission);

    return {
      applicationId,
      applicationNumber,
      submission,
      case: caseRecord,
    };
  }

  async submitCorrection(
    applicationId: string,
    applicantIdentityId: string,
    dto: SubmitApplicationDto,
  ) {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: { case: true, submissions: { orderBy: { sequenceNumber: 'desc' } } },
    });

    if (application?.applicantIdentityId !== applicantIdentityId) {
      throw new NotFoundException('Application not found');
    }

    if (application.case?.caseStatus !== 'WAITING_APPLICANT') {
      throw new ForbiddenException(
        'Corrections are only accepted when case is waiting for applicant',
      );
    }

    const originalSubmission = application.submissions[0];
    if (!originalSubmission) {
      throw new NotFoundException('No prior submission found');
    }

    await this.validation.assertServiceStartable(application.governmentServiceVersionId);
    this.validation.assertConfigurationFingerprint(
      dto.configurationFingerprint,
      application.configurationFingerprint,
    );

    const validation = await this.formValidation.validateResponse(
      application.formVersionId,
      dto.answers,
    );
    if (validation.outcome !== 'VALID') {
      throw new ConflictException({
        message: 'Form response validation failed',
        errors: validation.fieldErrors,
      });
    }

    const contentHash = hashSubmissionContent({
      answers: dto.answers,
      formVersionId: application.formVersionId,
      governmentServiceVersionId: application.governmentServiceVersionId,
      configurationFingerprint: application.configurationFingerprint,
    });

    const sequenceNumber = application.submissions.length + 1;

    const submission = await this.prisma.$transaction(async (tx) => {
      await tx.applicationSubmission.update({
        where: { id: originalSubmission.id },
        data: { status: ApplicationSubmissionStatus.SUPERSEDED, supersededAt: new Date() },
      });

      const created = await tx.applicationSubmission.create({
        data: {
          applicationId,
          submissionNumber: generateReferenceNumber(SUBMISSION_NUMBER_PREFIX),
          sequenceNumber,
          answersSnapshot: dto.answers as Prisma.InputJsonValue,
          configurationFingerprint: application.configurationFingerprint,
          governmentServiceVersionId: application.governmentServiceVersionId,
          formVersionId: application.formVersionId,
          contentHash,
          status: ApplicationSubmissionStatus.ACKNOWLEDGED,
          acknowledgedAt: new Date(),
          acknowledgmentReference: `ACK-CORR-${String(sequenceNumber)}`,
        },
      });

      return created;
    });

    await this.prisma.caseWorkflowInstance.updateMany({
      where: { caseId: application.case.id },
      data: { status: 'ACTIVE' },
    });

    await this.prisma.case.update({
      where: { id: application.case.id },
      data: { caseStatus: 'COMPLETENESS_REVIEW' },
    });

    return {
      applicationId,
      applicationNumber: application.applicationNumber,
      submission,
      case: application.case,
    };
  }

  async findById(applicationId: string, applicantIdentityId: string) {
    return this.findOwnedApplication(applicationId, applicantIdentityId);
  }

  private async findOwnedApplication(applicationId: string, applicantIdentityId: string) {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: { submissions: { orderBy: { sequenceNumber: 'asc' } }, case: true },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (application.applicantIdentityId !== applicantIdentityId) {
      throw new NotFoundException('Application not found');
    }

    return application;
  }
}
