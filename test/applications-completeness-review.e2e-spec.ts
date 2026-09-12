import { type INestApplication } from '@nestjs/common';
import {
  CaseWorkflowStage,
  CompletenessReviewItemStatus,
  CompletenessReviewStatus,
} from '@prisma/client';

import { APPLICATIONS_EXPLANATION_CODES } from '../src/applications/applications.constants';
import { ApplicationCaseService } from '../src/applications/cases/application-case.service';
import { ApplicantCorrectionService } from '../src/applications/completeness-review/applicant-correction.service';
import { CompletenessReviewService } from '../src/applications/completeness-review/completeness-review.service';
import { PrismaService } from '../src/database/prisma.service';
import { seedApplicationsCompletenessFixture } from './helpers/applications-test-fixtures';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';

describe('Phase 6E completeness review loop (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let caseService: ApplicationCaseService;
  let completenessReviewService: CompletenessReviewService;
  let applicantCorrectionService: ApplicantCorrectionService;

  beforeAll(async () => {
    ({ app } = await createIntegrationApp());
    prisma = app.get(PrismaService);
    caseService = app.get(ApplicationCaseService);
    completenessReviewService = app.get(CompletenessReviewService);
    applicantCorrectionService = app.get(ApplicantCorrectionService);
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  async function openCaseWithReview(
    fixture: Awaited<ReturnType<typeof seedApplicationsCompletenessFixture>>,
  ) {
    const { caseRecord, submission } = await caseService.openCaseWithInitialSubmission({
      governmentServiceId: fixture.governmentServiceId,
      governmentServiceVersionId: fixture.governmentServiceVersionId,
      applicantIdentityId: fixture.applicantIdentityId,
      answers: {
        IDENTITY_DOCUMENT: 'uploaded-ref-1',
        BUSINESS_PLAN: 'uploaded-ref-2',
        FEE_RECEIPT: 'uploaded-ref-3',
      },
      caseReferencePrefix: 'P6E',
    });

    const review = await completenessReviewService.startReview({
      caseId: caseRecord.id,
      applicationSubmissionId: submission.id,
      reviewer: {
        identityId: fixture.reviewerIdentityId,
        officeholderId: fixture.reviewerOfficeholderId,
        functionAuthorityRecordId: fixture.functionAuthorityRecordId,
      },
    });

    return { caseRecord, submission, review };
  }

  it('marks missing items as MISSING and does not auto-verify present items', async () => {
    const fixture = await seedApplicationsCompletenessFixture(prisma);
    const { review } = await openCaseWithReview(fixture);

    await completenessReviewService.assessItems(review.id, [
      { checklistItemCode: 'IDENTITY_DOCUMENT', status: CompletenessReviewItemStatus.PRESENT },
      { checklistItemCode: 'BUSINESS_PLAN', status: CompletenessReviewItemStatus.MISSING },
      { checklistItemCode: 'FEE_RECEIPT', status: CompletenessReviewItemStatus.CORRUPTED },
    ]);

    const updated = await prisma.completenessReview.findUniqueOrThrow({
      where: { id: review.id },
      include: { items: true },
    });

    const identityItem = updated.items.find(
      (item) => item.checklistItemCode === 'IDENTITY_DOCUMENT',
    );
    const businessPlanItem = updated.items.find(
      (item) => item.checklistItemCode === 'BUSINESS_PLAN',
    );
    const feeItem = updated.items.find((item) => item.checklistItemCode === 'FEE_RECEIPT');

    expect(identityItem?.status).toBe(CompletenessReviewItemStatus.PRESENT);
    expect(businessPlanItem?.status).toBe(CompletenessReviewItemStatus.MISSING);
    expect(feeItem?.status).toBe(CompletenessReviewItemStatus.CORRUPTED);
    expect(
      updated.items.every((item) => item.status !== ('VERIFIED' as CompletenessReviewItemStatus)),
    ).toBe(true);
  });

  it('rejects undisclosed checklist requirements during assessment', async () => {
    const fixture = await seedApplicationsCompletenessFixture(prisma);
    const { review } = await openCaseWithReview(fixture);

    await expect(
      completenessReviewService.assessItems(review.id, [
        {
          checklistItemCode: 'UNDISCLOSED_REQUIREMENT',
          status: CompletenessReviewItemStatus.MISSING,
        },
      ]),
    ).rejects.toMatchObject({
      response: {
        code: APPLICATIONS_EXPLANATION_CODES.UNDISCLOSED_REQUIREMENT,
      },
    });
  });

  it('issues a procedural deficiency notice that is not a refusal', async () => {
    const fixture = await seedApplicationsCompletenessFixture(prisma);
    const { review } = await openCaseWithReview(fixture);

    await completenessReviewService.assessItems(review.id, [
      { checklistItemCode: 'IDENTITY_DOCUMENT', status: CompletenessReviewItemStatus.PRESENT },
      { checklistItemCode: 'BUSINESS_PLAN', status: CompletenessReviewItemStatus.MISSING },
      { checklistItemCode: 'FEE_RECEIPT', status: CompletenessReviewItemStatus.PRESENT },
    ]);

    await completenessReviewService.finalizeReview(review.id, {
      identityId: fixture.reviewerIdentityId,
      officeholderId: fixture.reviewerOfficeholderId,
      functionAuthorityRecordId: fixture.functionAuthorityRecordId,
    });

    const notice = await completenessReviewService.issueDeficiencyNoticeForReview(review.id, {
      reference: 'DN-P6E-001',
      requiredApplicantAction: 'Submit missing business plan',
      responseDeadline: new Date('2026-12-31T23:59:59.000Z'),
      departmentContactReference: 'licensing@agency.gov',
      issuedByIdentityId: fixture.reviewerIdentityId,
      issuedByOfficeholderId: fixture.reviewerOfficeholderId,
    });

    expect(notice.isProceduralNotice).toBe(true);
    expect(notice.isRefusal).toBe(false);
    expect(notice.status).toBe('ISSUED');
    expect(notice.items.length).toBeGreaterThan(0);
  });

  it('creates a new submission on applicant correction without mutating the original', async () => {
    const fixture = await seedApplicationsCompletenessFixture(prisma);
    const { caseRecord, submission, review } = await openCaseWithReview(fixture);

    await completenessReviewService.assessItems(review.id, [
      { checklistItemCode: 'IDENTITY_DOCUMENT', status: CompletenessReviewItemStatus.PRESENT },
      { checklistItemCode: 'BUSINESS_PLAN', status: CompletenessReviewItemStatus.MISSING },
      { checklistItemCode: 'FEE_RECEIPT', status: CompletenessReviewItemStatus.PRESENT },
    ]);

    await completenessReviewService.finalizeReview(review.id, {
      identityId: fixture.reviewerIdentityId,
      officeholderId: fixture.reviewerOfficeholderId,
      functionAuthorityRecordId: fixture.functionAuthorityRecordId,
    });

    const notice = await completenessReviewService.issueDeficiencyNoticeForReview(review.id, {
      reference: 'DN-P6E-002',
      requiredApplicantAction: 'Submit missing business plan',
      responseDeadline: new Date('2026-12-31T23:59:59.000Z'),
      departmentContactReference: 'licensing@agency.gov',
      issuedByIdentityId: fixture.reviewerIdentityId,
      issuedByOfficeholderId: fixture.reviewerOfficeholderId,
    });

    const originalAnswers = { ...(submission.answers as Record<string, string>) };

    const correction = await applicantCorrectionService.submitCorrection({
      caseId: caseRecord.id,
      deficiencyNoticeId: notice.id,
      answers: {
        ...originalAnswers,
        BUSINESS_PLAN: 'corrected-upload-ref',
      },
      applicantIdentityId: fixture.applicantIdentityId,
      reviewer: {
        identityId: fixture.reviewerIdentityId,
        officeholderId: fixture.reviewerOfficeholderId,
        functionAuthorityRecordId: fixture.functionAuthorityRecordId,
      },
    });

    const originalAfter = await prisma.applicationSubmission.findUniqueOrThrow({
      where: { id: submission.id },
    });

    expect(correction.newSubmission.id).not.toBe(submission.id);
    expect(correction.newSubmission.submissionSequence).toBe(2);
    expect(correction.newSubmission.priorSubmissionId).toBe(submission.id);
    expect(originalAfter.answers).toEqual(originalAnswers);
    expect((correction.newSubmission.answers as Record<string, string>).BUSINESS_PLAN).toBe(
      'corrected-upload-ref',
    );
  });

  it('allows a second review to reach COMPLETE without implying approval', async () => {
    const fixture = await seedApplicationsCompletenessFixture(prisma);
    const { caseRecord, review } = await openCaseWithReview(fixture);

    await completenessReviewService.assessItems(review.id, [
      { checklistItemCode: 'IDENTITY_DOCUMENT', status: CompletenessReviewItemStatus.PRESENT },
      { checklistItemCode: 'BUSINESS_PLAN', status: CompletenessReviewItemStatus.MISSING },
      { checklistItemCode: 'FEE_RECEIPT', status: CompletenessReviewItemStatus.PRESENT },
    ]);

    await completenessReviewService.finalizeReview(review.id, {
      identityId: fixture.reviewerIdentityId,
      officeholderId: fixture.reviewerOfficeholderId,
      functionAuthorityRecordId: fixture.functionAuthorityRecordId,
    });

    const notice = await completenessReviewService.issueDeficiencyNoticeForReview(review.id, {
      reference: 'DN-P6E-003',
      requiredApplicantAction: 'Submit missing business plan',
      responseDeadline: new Date('2026-12-31T23:59:59.000Z'),
      departmentContactReference: 'licensing@agency.gov',
      issuedByIdentityId: fixture.reviewerIdentityId,
      issuedByOfficeholderId: fixture.reviewerOfficeholderId,
    });

    const correction = await applicantCorrectionService.submitCorrection({
      caseId: caseRecord.id,
      deficiencyNoticeId: notice.id,
      answers: {
        IDENTITY_DOCUMENT: 'uploaded-ref-1',
        BUSINESS_PLAN: 'corrected-upload-ref',
        FEE_RECEIPT: 'uploaded-ref-3',
      },
      applicantIdentityId: fixture.applicantIdentityId,
      reviewer: {
        identityId: fixture.reviewerIdentityId,
        officeholderId: fixture.reviewerOfficeholderId,
        functionAuthorityRecordId: fixture.functionAuthorityRecordId,
      },
    });

    await completenessReviewService.assessItems(correction.review.id, [
      { checklistItemCode: 'IDENTITY_DOCUMENT', status: CompletenessReviewItemStatus.PRESENT },
      { checklistItemCode: 'BUSINESS_PLAN', status: CompletenessReviewItemStatus.PRESENT },
      { checklistItemCode: 'FEE_RECEIPT', status: CompletenessReviewItemStatus.PRESENT },
    ]);

    const result = await completenessReviewService.finalizeReview(correction.review.id, {
      identityId: fixture.reviewerIdentityId,
      officeholderId: fixture.reviewerOfficeholderId,
      functionAuthorityRecordId: fixture.functionAuthorityRecordId,
    });

    const updatedCase = await caseService.getCase(caseRecord.id);

    expect(result.status).toBe(CompletenessReviewStatus.COMPLETE);
    expect(result.administrativelyComplete).toBe(true);
    expect(result.isApproval).toBe(false);
    expect(updatedCase.currentWorkflowStage).toBe(CaseWorkflowStage.SUBSTANTIVE_REVIEW);
  });

  it('prevents newer checklist versions from silently altering an existing case', async () => {
    const fixture = await seedApplicationsCompletenessFixture(prisma);
    const { caseRecord } = await openCaseWithReview(fixture);

    await prisma.governmentServiceChecklistItem.create({
      data: {
        governmentServiceVersionId: fixture.governmentServiceVersionId,
        itemCode: 'NEW_REQUIREMENT',
        label: 'New Requirement',
        sortOrder: 99,
        isRequired: true,
      },
    });

    const submissionService = app.get(
      (await import('../src/applications/submissions/application-submission.service'))
        .ApplicationSubmissionService,
    );

    await expect(
      submissionService.createSubmission({
        caseId: caseRecord.id,
        governmentServiceVersionId: fixture.governmentServiceVersionId,
        answers: {},
        submittedByIdentityId: fixture.applicantIdentityId,
      }),
    ).rejects.toMatchObject({
      response: {
        code: APPLICATIONS_EXPLANATION_CODES.NEWER_CHECKLIST_CANNOT_ALTER_EXISTING_CASE,
      },
    });
  });

  it('blocks unauthorized reviewers from finalizing completeness', async () => {
    const fixture = await seedApplicationsCompletenessFixture(prisma);
    const { review } = await openCaseWithReview(fixture);

    await completenessReviewService.assessItems(review.id, [
      { checklistItemCode: 'IDENTITY_DOCUMENT', status: CompletenessReviewItemStatus.PRESENT },
      { checklistItemCode: 'BUSINESS_PLAN', status: CompletenessReviewItemStatus.PRESENT },
      { checklistItemCode: 'FEE_RECEIPT', status: CompletenessReviewItemStatus.PRESENT },
    ]);

    await expect(
      completenessReviewService.finalizeReview(review.id, {
        identityId: fixture.unauthorizedReviewerIdentityId,
        functionAuthorityRecordId: fixture.functionAuthorityRecordId,
      }),
    ).rejects.toMatchObject({
      response: {
        code: APPLICATIONS_EXPLANATION_CODES.UNAUTHORIZED_COMPLETENESS_FINALIZATION,
      },
    });
  });

  it('blocks AI-assisted actors from finalizing consequential completeness when human review is required', async () => {
    const fixture = await seedApplicationsCompletenessFixture(prisma);
    const { review } = await openCaseWithReview(fixture);

    await completenessReviewService.assessItems(review.id, [
      { checklistItemCode: 'IDENTITY_DOCUMENT', status: CompletenessReviewItemStatus.PRESENT },
      { checklistItemCode: 'BUSINESS_PLAN', status: CompletenessReviewItemStatus.PRESENT },
      { checklistItemCode: 'FEE_RECEIPT', status: CompletenessReviewItemStatus.PRESENT },
    ]);

    await expect(
      completenessReviewService.finalizeReview(review.id, {
        identityId: fixture.aiAssistedIdentityId,
        functionAuthorityRecordId: fixture.functionAuthorityRecordId,
        isAiAssisted: true,
        requiresHumanReview: true,
      }),
    ).rejects.toMatchObject({
      response: {
        code: APPLICATIONS_EXPLANATION_CODES.AI_CANNOT_FINALIZE_CONSEQUENTIAL_REVIEW,
      },
    });
  });

  it('ties complete determination to the exact pinned checklist configuration', async () => {
    const fixture = await seedApplicationsCompletenessFixture(prisma);
    const { submission, review } = await openCaseWithReview(fixture);

    expect(review.checklistConfigurationFingerprint).toBe(submission.pinnedChecklistFingerprint);

    const determination = completenessReviewService.determineCompletenessFromItems([
      { isRequired: true, status: CompletenessReviewItemStatus.PRESENT },
      { isRequired: true, status: CompletenessReviewItemStatus.PRESENT },
      { isRequired: true, status: CompletenessReviewItemStatus.PRESENT },
    ]);

    expect(determination).toBe(CompletenessReviewStatus.COMPLETE);
  });
});
