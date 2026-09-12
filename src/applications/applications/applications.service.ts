import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  Application,
  ApplicationStatus,
  ApplicationSubmission,
  Prisma,
  SubmissionChannel,
  SubmittedCapacity,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import {
  generateAcknowledgmentReference,
  generateApplicationNumber,
} from '../common/application-number.util';
import {
  APPLICATION_EDITABLE_STATUSES,
  APPLICATION_RESUBMITTABLE_STATUSES,
  APPLICATION_SUBMITTABLE_STATUSES,
  APPLICATION_WITHDRAWABLE_STATUSES,
  SUBMISSION_RECEIPT_DISCLAIMER,
} from '../common/applications.constants';
import { computePayloadHash } from '../common/payload-hash.util';
import { ApplicationAccessService } from './application-access.service';
import { ApplicationIntakeValidationService } from './application-intake-validation.service';
import { ApplicationResponseDto } from './dto/application-response.dto';
import { ApplicationSubmissionResponseDto } from './dto/application-submission-response.dto';
import { CreateApplicationDto } from './dto/create-application.dto';
import { SubmissionAcknowledgmentDto } from './dto/submission-acknowledgment.dto';
import { SubmitApplicationDto } from './dto/submit-application.dto';
import { UpdateApplicationDraftDto } from './dto/update-application-draft.dto';

@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger(ApplicationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ApplicationAccessService,
    private readonly intakeValidation: ApplicationIntakeValidationService,
  ) {}

  async create(
    dto: CreateApplicationDto,
    applicantIdentityId: string,
  ): Promise<ApplicationResponseDto> {
    const serviceVersion = await this.prisma.governmentServiceVersion.findUnique({
      where: { id: dto.governmentServiceVersionId },
      include: { governmentService: true },
    });

    if (!serviceVersion) {
      throw new BadRequestException(
        `Government service version "${dto.governmentServiceVersionId}" was not found`,
      );
    }

    let organizationId = dto.organizationId ?? null;
    const representativeAuthorityId = dto.representativeAuthorityId ?? null;

    if (representativeAuthorityId) {
      const authorityContext = await this.access.validateRepresentativeAuthority(
        applicantIdentityId,
        representativeAuthorityId,
      );
      organizationId = authorityContext.organizationId;
    } else if (organizationId) {
      await this.access.validateOrganizationAccess(applicantIdentityId, organizationId);
    }

    const application = await this.prisma.application.create({
      data: {
        applicationNumber: generateApplicationNumber(),
        applicantIdentityId,
        representativeAuthorityId,
        organizationId,
        governmentServiceId: serviceVersion.governmentServiceId,
        governmentServiceVersionId: serviceVersion.id,
        submissionChannel: dto.submissionChannel ?? SubmissionChannel.WEB_PORTAL,
        currentStatus: ApplicationStatus.DRAFT,
      },
    });

    return this.mapApplication(application);
  }

  async findOne(applicationId: string, identityId: string): Promise<ApplicationResponseDto> {
    const application = await this.access.assertCanAccess(applicationId, identityId);
    return this.mapApplication(application);
  }

  async updateDraft(
    applicationId: string,
    dto: UpdateApplicationDraftDto,
    identityId: string,
  ): Promise<ApplicationResponseDto> {
    const application = await this.access.assertCanAccess(applicationId, identityId);

    if (
      !APPLICATION_EDITABLE_STATUSES.includes(
        application.currentStatus as (typeof APPLICATION_EDITABLE_STATUSES)[number],
      )
    ) {
      throw new BadRequestException('Application draft can no longer be edited');
    }

    if (dto.configurationFingerprint) {
      await this.intakeValidation.validateServiceVersionForSubmission(
        application.governmentServiceVersionId,
        dto.configurationFingerprint,
        dto.formVersionId,
      );
    }

    const updated = await this.prisma.application.update({
      where: { id: applicationId },
      data: {
        draftAnswersPayload: dto.answers as Prisma.InputJsonValue,
        draftFormVersionId: dto.formVersionId,
        currentStatus: ApplicationStatus.READY_FOR_SUBMISSION,
      },
    });

    return this.mapApplication(updated);
  }

  async submit(
    applicationId: string,
    dto: SubmitApplicationDto,
    identityId: string,
  ): Promise<SubmissionAcknowledgmentDto> {
    const application = await this.access.assertCanAccess(applicationId, identityId);

    if (dto.idempotencyKey) {
      const existing = await this.prisma.applicationSubmissionIdempotencyKey.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
        include: {
          submission: {
            include: {
              application: {
                include: {
                  governmentServiceVersion: {
                    include: {
                      governmentService: true,
                      functionMappings: {
                        orderBy: { sequenceOrder: 'asc' },
                        include: {
                          functionAuthorityRecord: { select: { name: true } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (existing) {
        if (existing.applicationId !== applicationId) {
          throw new ConflictException('Idempotency key is already associated with another application');
        }

        return this.buildAcknowledgment(existing.submission, existing.submission.application);
      }
    }

    if (
      !APPLICATION_SUBMITTABLE_STATUSES.includes(
        application.currentStatus as (typeof APPLICATION_SUBMITTABLE_STATUSES)[number],
      )
    ) {
      throw new BadRequestException('Application is not in a submittable state');
    }

    const representativeAuthorityId =
      dto.representativeAuthorityId ?? application.representativeAuthorityId ?? null;

    if (representativeAuthorityId) {
      await this.access.validateRepresentativeAuthority(identityId, representativeAuthorityId);
    }

    const { serviceVersion, pinnedConfiguration, configurationFingerprint } =
      await this.intakeValidation.validateServiceVersionForSubmission(
        application.governmentServiceVersionId,
        dto.configurationFingerprint,
        dto.formVersionId,
      );

    await this.intakeValidation.validateFormAnswers(dto.formVersionId, dto.answers);

    const submittedCapacity =
      dto.submittedCapacity ??
      (representativeAuthorityId ? SubmittedCapacity.REPRESENTATIVE : SubmittedCapacity.SELF);

    const submissionChannel = dto.submissionChannel ?? application.submissionChannel;

    const submittedAt = new Date();
    const payloadHash = computePayloadHash(dto.answers);
    const nextSequence = 1;

    const result = await this.prisma.$transaction(async (tx) => {
      const submission = await tx.applicationSubmission.create({
        data: {
          applicationId,
          submissionSequence: nextSequence,
          serviceVersionId: serviceVersion.id,
          formVersionId: dto.formVersionId,
          configurationFingerprint,
          pinnedConfiguration: pinnedConfiguration as unknown as Prisma.InputJsonValue,
          answersPayload: dto.answers as Prisma.InputJsonValue,
          submittedByIdentityId: identityId,
          submittedCapacity,
          representativeAuthorityId,
          submissionChannel,
          submittedAt,
          payloadHash,
          acknowledgmentReference: generateAcknowledgmentReference(
            application.applicationNumber,
            nextSequence,
          ),
        },
      });

      if (dto.idempotencyKey) {
        await tx.applicationSubmissionIdempotencyKey.create({
          data: {
            idempotencyKey: dto.idempotencyKey,
            applicationId,
            submissionId: submission.id,
          },
        });
      }

      await tx.application.update({
        where: { id: applicationId },
        data: {
          currentStatus: ApplicationStatus.RECEIVED,
          draftAnswersPayload: Prisma.DbNull,
          draftFormVersionId: null,
        },
      });

      return submission;
    });

    this.logger.log({
      event: 'APPLICATION_SUBMITTED',
      applicationId,
      submissionId: result.id,
      applicationNumber: application.applicationNumber,
      serviceVersionId: serviceVersion.id,
      hasPaymentMetadata: Boolean(dto.paymentMetadata),
    });

    const refreshedApplication = await this.prisma.application.findUniqueOrThrow({
      where: { id: applicationId },
      include: {
        governmentServiceVersion: {
          include: {
            governmentService: true,
            functionMappings: {
              orderBy: { sequenceOrder: 'asc' },
              include: { functionAuthorityRecord: { select: { name: true } } },
            },
          },
        },
      },
    });

    return this.buildAcknowledgment(result, refreshedApplication);
  }

  async resubmit(
    applicationId: string,
    dto: SubmitApplicationDto,
    identityId: string,
  ): Promise<SubmissionAcknowledgmentDto> {
    const application = await this.access.assertCanAccess(applicationId, identityId);

    if (dto.idempotencyKey) {
      const existing = await this.prisma.applicationSubmissionIdempotencyKey.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
        include: {
          submission: {
            include: {
              application: {
                include: {
                  governmentServiceVersion: {
                    include: {
                      governmentService: true,
                      functionMappings: {
                        orderBy: { sequenceOrder: 'asc' },
                        include: {
                          functionAuthorityRecord: { select: { name: true } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (existing) {
        if (existing.applicationId !== applicationId) {
          throw new ConflictException('Idempotency key is already associated with another application');
        }

        return this.buildAcknowledgment(existing.submission, existing.submission.application);
      }
    }

    if (
      !APPLICATION_RESUBMITTABLE_STATUSES.includes(
        application.currentStatus as (typeof APPLICATION_RESUBMITTABLE_STATUSES)[number],
      )
    ) {
      throw new BadRequestException('Application is not awaiting correction resubmission');
    }

    const latestSubmission = await this.prisma.applicationSubmission.findFirst({
      where: { applicationId },
      orderBy: { submissionSequence: 'desc' },
    });

    if (!latestSubmission) {
      throw new BadRequestException('No prior submission exists to resubmit');
    }

    const representativeAuthorityId =
      dto.representativeAuthorityId ?? application.representativeAuthorityId ?? null;

    if (representativeAuthorityId) {
      await this.access.validateRepresentativeAuthority(identityId, representativeAuthorityId);
    }

    const { serviceVersion, pinnedConfiguration, configurationFingerprint } =
      await this.intakeValidation.validateServiceVersionForSubmission(
        application.governmentServiceVersionId,
        dto.configurationFingerprint,
        dto.formVersionId,
      );

    await this.intakeValidation.validateFormAnswers(dto.formVersionId, dto.answers);

    const submittedCapacity =
      dto.submittedCapacity ??
      (representativeAuthorityId ? SubmittedCapacity.REPRESENTATIVE : SubmittedCapacity.SELF);

    const submissionChannel = dto.submissionChannel ?? application.submissionChannel;

    const submittedAt = new Date();
    const payloadHash = computePayloadHash(dto.answers);
    const nextSequence = latestSubmission.submissionSequence + 1;

    const result = await this.prisma.$transaction(async (tx) => {
      const submission = await tx.applicationSubmission.create({
        data: {
          applicationId,
          submissionSequence: nextSequence,
          serviceVersionId: serviceVersion.id,
          formVersionId: dto.formVersionId,
          configurationFingerprint,
          pinnedConfiguration: pinnedConfiguration as unknown as Prisma.InputJsonValue,
          answersPayload: dto.answers as Prisma.InputJsonValue,
          submittedByIdentityId: identityId,
          submittedCapacity,
          representativeAuthorityId,
          submissionChannel,
          submittedAt,
          payloadHash,
          acknowledgmentReference: generateAcknowledgmentReference(
            application.applicationNumber,
            nextSequence,
          ),
          supersedesSubmissionId: latestSubmission.id,
        },
      });

      if (dto.idempotencyKey) {
        await tx.applicationSubmissionIdempotencyKey.create({
          data: {
            idempotencyKey: dto.idempotencyKey,
            applicationId,
            submissionId: submission.id,
          },
        });
      }

      await tx.application.update({
        where: { id: applicationId },
        data: { currentStatus: ApplicationStatus.RESUBMITTED },
      });

      return submission;
    });

    this.logger.log({
      event: 'APPLICATION_RESUBMITTED',
      applicationId,
      submissionId: result.id,
      submissionSequence: nextSequence,
      supersedesSubmissionId: latestSubmission.id,
    });

    const refreshedApplication = await this.prisma.application.findUniqueOrThrow({
      where: { id: applicationId },
      include: {
        governmentServiceVersion: {
          include: {
            governmentService: true,
            functionMappings: {
              orderBy: { sequenceOrder: 'asc' },
              include: { functionAuthorityRecord: { select: { name: true } } },
            },
          },
        },
      },
    });

    return this.buildAcknowledgment(result, refreshedApplication);
  }

  async withdraw(applicationId: string, identityId: string): Promise<ApplicationResponseDto> {
    const application = await this.access.assertCanAccess(applicationId, identityId);

    if (
      !APPLICATION_WITHDRAWABLE_STATUSES.includes(
        application.currentStatus as (typeof APPLICATION_WITHDRAWABLE_STATUSES)[number],
      )
    ) {
      throw new BadRequestException('Application cannot be withdrawn in its current state');
    }

    const updated = await this.prisma.application.update({
      where: { id: applicationId },
      data: { currentStatus: ApplicationStatus.WITHDRAWN },
    });

    return this.mapApplication(updated);
  }

  async listSubmissions(
    applicationId: string,
    identityId: string,
  ): Promise<ApplicationSubmissionResponseDto[]> {
    await this.access.assertCanAccess(applicationId, identityId);

    const submissions = await this.prisma.applicationSubmission.findMany({
      where: { applicationId },
      orderBy: { submissionSequence: 'asc' },
    });

    return submissions.map((submission) => this.mapSubmission(submission));
  }

  private buildAcknowledgment(
    submission: ApplicationSubmission,
    application: Application & {
      governmentServiceVersion: {
        version: string;
        governmentService: { publicName: string };
        functionMappings: {
          publicStageLabel: string | null;
          functionAuthorityRecord: { name: string };
        }[];
      };
    },
  ): SubmissionAcknowledgmentDto {
    const nextExpectedStage = this.intakeValidation.resolveNextExpectedStage(
      application.governmentServiceVersion as Parameters<
        ApplicationIntakeValidationService['resolveNextExpectedStage']
      >[0],
    );

    return {
      applicationNumber: application.applicationNumber,
      submissionId: submission.id,
      receivedAt: submission.submittedAt.toISOString(),
      serviceName: application.governmentServiceVersion.governmentService.publicName,
      serviceVersionLabel: application.governmentServiceVersion.version,
      formVersionId: submission.formVersionId,
      configurationFingerprint: submission.configurationFingerprint,
      nextExpectedStage,
      currentStatus: application.currentStatus,
      acknowledgmentReference: submission.acknowledgmentReference,
      receiptDisclaimer: SUBMISSION_RECEIPT_DISCLAIMER,
    };
  }

  private mapApplication(application: Application): ApplicationResponseDto {
    return {
      id: application.id,
      applicationNumber: application.applicationNumber,
      applicantIdentityId: application.applicantIdentityId,
      representativeAuthorityId: application.representativeAuthorityId,
      organizationId: application.organizationId,
      governmentServiceId: application.governmentServiceId,
      governmentServiceVersionId: application.governmentServiceVersionId,
      currentStatus: application.currentStatus,
      submissionChannel: application.submissionChannel,
      draftFormVersionId: application.draftFormVersionId,
      createdAt: application.createdAt.toISOString(),
      updatedAt: application.updatedAt.toISOString(),
    };
  }

  private mapSubmission(submission: ApplicationSubmission): ApplicationSubmissionResponseDto {
    return {
      id: submission.id,
      applicationId: submission.applicationId,
      submissionSequence: submission.submissionSequence,
      serviceVersionId: submission.serviceVersionId,
      formVersionId: submission.formVersionId,
      configurationFingerprint: submission.configurationFingerprint,
      submittedByIdentityId: submission.submittedByIdentityId,
      submittedCapacity: submission.submittedCapacity,
      representativeAuthorityId: submission.representativeAuthorityId,
      submissionChannel: submission.submissionChannel,
      submittedAt: submission.submittedAt.toISOString(),
      payloadHash: submission.payloadHash,
      acknowledgmentReference: submission.acknowledgmentReference,
      supersedesSubmissionId: submission.supersedesSubmissionId,
      createdAt: submission.createdAt.toISOString(),
    };
  }
}
