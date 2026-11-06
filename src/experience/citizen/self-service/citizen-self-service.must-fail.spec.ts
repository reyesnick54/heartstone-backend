/* eslint-disable @typescript-eslint/no-unsafe-assignment -- jest asymmetric matcher composition */
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import {
  ApplicationStatus,
  CaseStatus,
  DocumentAuthenticityStatus,
  DocumentSourceType,
  GovernmentDecisionStatus,
  MalwareScanStatus,
  RecordCorrectionStatus,
  RedressMatterStatus,
} from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { type PrismaService } from '../../../database/prisma.service';
import { RecordCorrectionService } from '../../../evidence/correction/record-correction.service';
import { type RecordIntegrityService } from '../../../evidence/integrity/record-integrity.service';
import { type DocumentAssociationsService } from '../../../evidence-records/documents/document-associations.service';
import { type DocumentRecordsService } from '../../../evidence-records/documents/document-records.service';
import { type DocumentVersionsService } from '../../../evidence-records/documents/document-versions.service';
import { type SecurityAuditService } from '../../../identity/audit/security-audit.service';
import { type SessionContextDto } from '../../../identity/auth/dto/session-context.dto';
import { type RedressMatterService } from '../../../redress/matters/redress-matter.service';
import { CitizenApplicationDocumentsService } from './citizen-application-documents.service';
import { CitizenCommunicationPreferencesService } from './citizen-communication-preferences.service';
import { CitizenProfileCorrectionsService } from './citizen-profile-corrections.service';
import { CitizenReviewRequestsService } from './citizen-review-requests.service';
import {
  CreateCitizenProfileCorrectionDto,
  CreateCitizenReviewRequestDto,
  UpdateCitizenCommunicationPreferencesDto,
  UploadCitizenApplicationDocumentDto,
} from './dto/citizen-self-service.dto';

const ME = '11111111-1111-4111-8111-111111111111';
const CASE_ID = '22222222-2222-4222-8222-222222222222';
const DECISION_ID = '33333333-3333-4333-8333-333333333333';
const APPLICATION_ID = '44444444-4444-4444-8444-444444444444';

const session = { identityId: ME, sessionId: 'session-1' } as SessionContextDto;
const auditRecord = jest.fn();
const audit = { record: auditRecord } as unknown as SecurityAuditService;

const VALIDATION = { whitelist: true, forbidNonWhitelisted: true } as const;

describe('Citizen self-service must-fail rules', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('request bodies never carry an identity', () => {
    const cases: [string, new () => object, Record<string, unknown>, string][] = [
      [
        'review request',
        CreateCitizenReviewRequestDto,
        { decisionId: DECISION_ID, routeCode: 'R', groundsStatement: 'x'.repeat(30) },
        'appellantIdentityId',
      ],
      [
        'profile correction',
        CreateCitizenProfileCorrectionDto,
        { givenName: 'A', reason: 'Spelling is wrong on file' },
        'requestedBy',
      ],
      [
        'communication preferences',
        UpdateCitizenCommunicationPreferencesDto,
        { preferences: [] },
        'identityId',
      ],
      [
        'document upload',
        UploadCitizenApplicationDocumentDto,
        {
          title: 't',
          documentType: 'd',
          originalFilename: 'a.pdf',
          contentType: 'application/pdf',
          contentBase64: 'YQ==',
        },
        'receivedFromIdentityId',
      ],
    ];

    it.each(cases)(
      '%s body rejects a client-supplied identity',
      async (_, dtoClass, valid, forbidden) => {
        const ok = await validate(plainToInstance(dtoClass, valid), VALIDATION);
        expect(ok).toEqual([]);
        const forged = await validate(
          plainToInstance(dtoClass, { ...valid, [forbidden]: ME }),
          VALIDATION,
        );
        expect(forged.map((error) => error.property)).toContain(forbidden);
      },
    );

    it('rejects upload of verification or storage fields', async () => {
      const errors = await validate(
        plainToInstance(UploadCitizenApplicationDocumentDto, {
          title: 't',
          documentType: 'd',
          originalFilename: 'a.pdf',
          contentType: 'application/pdf',
          contentBase64: 'YQ==',
          authenticityStatus: 'AUTHENTICATED',
          malwareScanStatus: 'CLEAN',
        }),
        VALIDATION,
      );
      expect(errors.map((error) => error.property).sort()).toEqual([
        'authenticityStatus',
        'malwareScanStatus',
      ]);
    });
  });

  describe('request for review', () => {
    const tx = {
      $executeRaw: jest.fn(),
      redressMatter: { findMany: jest.fn() },
    };
    const prisma = {
      case: { findFirst: jest.fn() },
      governmentDecision: { findFirst: jest.fn(), findMany: jest.fn() },
      governmentServiceRedressRoute: { findMany: jest.fn() },
      redressMatter: { findMany: jest.fn() },
      $transaction: jest.fn((fn: (client: typeof tx) => unknown) => fn(tx)),
    };
    const redress = { fileMatter: jest.fn() };
    const service = new CitizenReviewRequestsService(
      prisma as unknown as PrismaService,
      redress as unknown as RedressMatterService,
      audit,
    );
    const dto = {
      decisionId: DECISION_ID,
      routeCode: 'INTERNAL_REVIEW',
      groundsStatement: 'The decision overlooked the documents I submitted.',
    };

    beforeEach(() => {
      prisma.case.findFirst.mockResolvedValue({
        id: CASE_ID,
        caseNumber: 'CASE-1',
        governmentServiceVersionId: 'gsv-1',
      });
      prisma.governmentDecision.findFirst.mockResolvedValue({
        id: DECISION_ID,
        decisionStatus: GovernmentDecisionStatus.EFFECTIVE,
      });
      prisma.governmentServiceRedressRoute.findMany.mockResolvedValue([
        {
          routeCode: 'INTERNAL_REVIEW',
          label: 'Internal review',
          description: null,
          routeVersions: [
            {
              id: 'route-version-1',
              automaticStayOnFiling: false,
              functionAuthorityRecord: { id: 'far-1', name: 'Internal review authority' },
            },
          ],
        },
      ]);
      tx.redressMatter.findMany.mockResolvedValue([]);
      redress.fileMatter.mockResolvedValue({
        id: 'matter-1',
        redressMatterNumber: 'RM-1',
        status: RedressMatterStatus.FILED,
        challengedDecisionId: DECISION_ID,
        filedAt: new Date('2026-11-06T00:00:00Z'),
        decisionReviewReference: {
          reviewRoute: 'INTERNAL_REVIEW',
          groundsStatement: dto.groundsStatement,
          interimEffect: 'NONE',
          stayStatus: 'NONE',
        },
      });
    });

    it("another citizen's case is not found and nothing is filed", async () => {
      prisma.case.findFirst.mockResolvedValue(null);

      await expect(service.fileReviewRequest(session, CASE_ID, dto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.case.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: CASE_ID, applicantIdentityId: ME } }),
      );
      expect(redress.fileMatter).not.toHaveBeenCalled();
    });

    it('a decision from another case is not found', async () => {
      prisma.governmentDecision.findFirst.mockResolvedValue(null);

      await expect(service.fileReviewRequest(session, CASE_ID, dto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.governmentDecision.findFirst).toHaveBeenCalledWith({
        where: { id: DECISION_ID, caseId: CASE_ID },
      });
    });

    it('cannot be filed twice for the same decision while a review is open', async () => {
      tx.redressMatter.findMany.mockResolvedValue([
        {
          id: 'matter-0',
          redressMatterNumber: 'RM-0',
          status: RedressMatterStatus.UNDER_REVIEW,
          decisionReviewReference: { reviewRoute: 'INTERNAL_REVIEW' },
        },
      ]);

      await expect(service.fileReviewRequest(session, CASE_ID, dto)).rejects.toMatchObject({
        response: { code: 'REVIEW_ALREADY_REQUESTED' },
      });
      expect(tx.$executeRaw).toHaveBeenCalled();
      expect(redress.fileMatter).not.toHaveBeenCalled();
    });

    it('cannot be re-filed on the same route after that review was decided', async () => {
      tx.redressMatter.findMany.mockResolvedValue([
        {
          id: 'matter-0',
          redressMatterNumber: 'RM-0',
          status: RedressMatterStatus.DECIDED,
          decisionReviewReference: { reviewRoute: 'INTERNAL_REVIEW' },
        },
      ]);

      await expect(service.fileReviewRequest(session, CASE_ID, dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(redress.fileMatter).not.toHaveBeenCalled();
    });

    it('a decision that is not yet final cannot be reviewed', async () => {
      prisma.governmentDecision.findFirst.mockResolvedValue({
        id: DECISION_ID,
        decisionStatus: GovernmentDecisionStatus.SIGNATURE_PENDING,
      });

      await expect(service.fileReviewRequest(session, CASE_ID, dto)).rejects.toMatchObject({
        response: { code: 'DECISION_NOT_REVIEWABLE' },
      });
    });

    it('a route that is not configured and active for the service is refused', async () => {
      prisma.governmentServiceRedressRoute.findMany.mockResolvedValue([
        { routeCode: 'INTERNAL_REVIEW', label: 'x', description: null, routeVersions: [] },
      ]);

      await expect(service.fileReviewRequest(session, CASE_ID, dto)).rejects.toMatchObject({
        response: { code: 'REVIEW_ROUTE_NOT_AVAILABLE' },
      });
    });

    it('files as the session identity on the configured route version and audits it', async () => {
      const result = await service.fileReviewRequest(session, CASE_ID, dto);

      expect(redress.fileMatter).toHaveBeenCalledWith(
        {
          routeVersionId: 'route-version-1',
          challengedDecisionId: DECISION_ID,
          caseId: CASE_ID,
          appellantIdentityId: ME,
          reviewRoute: 'INTERNAL_REVIEW',
          reviewAuthority: 'Internal review authority',
          groundsStatement: dto.groundsStatement,
        },
        tx,
      );
      expect(result).toMatchObject({ reference: 'RM-1', status: RedressMatterStatus.FILED });
      expect(auditRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          actorIdentityId: ME,
          metadata: expect.objectContaining({ action: 'CITIZEN_REVIEW_REQUEST_FILED' }),
        }),
      );
    });
  });

  describe('profile correction', () => {
    const person = { id: 'person-1', givenName: 'Jon', familyName: 'Doe', displayName: null };
    const prisma = {
      identity: { findUnique: jest.fn() },
      person: { findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
      documentRecord: { count: jest.fn() },
      recordCorrection: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn() },
      $transaction: jest.fn(),
    };
    const integrity = { append: jest.fn() };
    const corrections = new RecordCorrectionService(
      prisma as unknown as PrismaService,
      integrity as unknown as RecordIntegrityService,
    );
    const service = new CitizenProfileCorrectionsService(
      prisma as unknown as PrismaService,
      corrections,
      audit,
    );

    beforeEach(() => {
      prisma.identity.findUnique.mockResolvedValue({ person });
      prisma.person.findUnique.mockResolvedValue(person);
      prisma.recordCorrection.create.mockImplementation(({ data }: { data: object }) => ({
        id: 'corr-1',
        requestedAt: new Date('2026-11-06T00:00:00Z'),
        ...data,
      }));
    });

    it('records a REQUESTED correction and does not change the person record', async () => {
      const result = await service.request(session, {
        givenName: 'John',
        reason: 'My given name is misspelled',
      });

      expect(prisma.recordCorrection.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          targetRecordType: 'Person',
          targetRecordId: 'person-1',
          requestedBy: ME,
          status: RecordCorrectionStatus.REQUESTED,
          proposedChanges: { givenName: { current: 'Jon', requested: 'John' } },
        }),
      });
      expect(prisma.person.update).not.toHaveBeenCalled();
      expect(prisma.person.updateMany).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        status: RecordCorrectionStatus.REQUESTED,
        requestedChanges: { givenName: 'John' },
      });
    });

    it('the governed implement step refuses to overwrite a Person record directly', async () => {
      prisma.recordCorrection.findUnique.mockResolvedValue({
        id: 'corr-1',
        status: RecordCorrectionStatus.APPROVED,
        targetRecordType: 'Person',
        targetRecordId: 'person-1',
      });
      prisma.$transaction.mockImplementation((fn: (client: typeof prisma) => unknown) =>
        fn(prisma),
      );

      await expect(
        corrections.implementCorrection({
          correctionId: 'corr-1',
          actorIdentityId: 'official-1',
          correctedContentReference: 'ref',
          correctedContent: { givenName: 'John' },
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.person.update).not.toHaveBeenCalled();
    });

    it('rejects a request that changes nothing', async () => {
      await expect(
        service.request(session, { givenName: 'Jon', reason: 'Nothing actually differs' }),
      ).rejects.toMatchObject({ response: { code: 'NO_CHANGE_REQUESTED' } });
      expect(prisma.recordCorrection.create).not.toHaveBeenCalled();
    });

    it("cannot cite another person's documents as support", async () => {
      prisma.documentRecord.count.mockResolvedValue(0);

      await expect(
        service.request(session, {
          familyName: 'Doe-Smith',
          reason: 'Name changed by marriage',
          supportingDocumentIds: ['55555555-5555-4555-8555-555555555555'],
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.documentRecord.count).toHaveBeenCalledWith({
        where: {
          id: { in: ['55555555-5555-4555-8555-555555555555'] },
          versions: { some: { receivedFromIdentityId: ME } },
        },
      });
      expect(prisma.recordCorrection.create).not.toHaveBeenCalled();
    });

    it('a retry with the same idempotency key returns the original request', async () => {
      prisma.recordCorrection.findUnique.mockResolvedValue({
        id: 'corr-0',
        status: RecordCorrectionStatus.REQUESTED,
        proposedChanges: { givenName: { current: 'Jon', requested: 'John' } },
        errorOrDisputeDescription: 'My given name is misspelled',
        supportingEvidenceIds: [],
        requestedAt: new Date('2026-11-05T00:00:00Z'),
      });

      const result = await service.request(session, {
        givenName: 'John',
        reason: 'My given name is misspelled',
        idempotencyKey: 'retry-1',
      });

      expect(result.id).toBe('corr-0');
      expect(prisma.recordCorrection.findUnique).toHaveBeenCalledWith({
        where: { requestedBy_idempotencyKey: { requestedBy: ME, idempotencyKey: 'retry-1' } },
      });
      expect(prisma.recordCorrection.create).not.toHaveBeenCalled();
    });
  });

  describe('application document upload', () => {
    const prisma = {
      application: { findFirst: jest.fn() },
      documentVersion: { findFirst: jest.fn(), findUniqueOrThrow: jest.fn() },
    };
    const records = { create: jest.fn() };
    const versions = { uploadVersion: jest.fn() };
    const associations = { associate: jest.fn() };
    const service = new CitizenApplicationDocumentsService(
      prisma as unknown as PrismaService,
      records as unknown as DocumentRecordsService,
      versions as unknown as DocumentVersionsService,
      associations as unknown as DocumentAssociationsService,
      audit,
    );
    const dto = {
      title: 'Proof of address',
      documentType: 'PROOF_OF_ADDRESS',
      originalFilename: 'address.pdf',
      contentType: 'application/pdf' as const,
      contentBase64: Buffer.from('%PDF-1.7 test').toString('base64'),
    };
    const storedVersion = {
      id: 'version-1',
      originalFilename: 'address.pdf',
      contentType: 'application/pdf',
      sizeBytes: 13,
      sha256: 'abc',
      malwareScanStatus: MalwareScanStatus.CLEAN,
      authenticityStatus: DocumentAuthenticityStatus.NOT_EVALUATED,
    };

    const application = (status: ApplicationStatus, caseStatus?: CaseStatus) => ({
      id: APPLICATION_ID,
      status,
      governmentService: { responsibleInstitutionId: 'inst-1' },
      case: caseStatus ? { id: CASE_ID, status: caseStatus } : null,
    });

    beforeEach(() => {
      prisma.documentVersion.findFirst.mockResolvedValue(null);
      records.create.mockResolvedValue({
        id: 'doc-1',
        documentNumber: 'DOC-1',
        title: dto.title,
        documentType: dto.documentType,
      });
      versions.uploadVersion.mockResolvedValue(storedVersion);
      prisma.documentVersion.findUniqueOrThrow.mockResolvedValue(storedVersion);
    });

    it("another citizen's application is not found and nothing is stored", async () => {
      prisma.application.findFirst.mockResolvedValue(null);

      await expect(service.upload(session, APPLICATION_ID, dto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.application.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: APPLICATION_ID, applicantIdentityId: ME } }),
      );
      expect(versions.uploadVersion).not.toHaveBeenCalled();
    });

    it.each([
      [ApplicationStatus.WITHDRAWN, undefined],
      [ApplicationStatus.CLOSED, CaseStatus.CLOSED],
      [ApplicationStatus.SUBMITTED, CaseStatus.SUBSTANTIVE_REVIEW],
      [ApplicationStatus.SUBMITTED, CaseStatus.DECIDED],
    ])('a %s application with case %s does not accept uploads', async (status, caseStatus) => {
      prisma.application.findFirst.mockResolvedValue(application(status, caseStatus));

      await expect(service.upload(session, APPLICATION_ID, dto)).rejects.toMatchObject({
        response: { code: 'APPLICATION_CLOSED_FOR_UPLOADS' },
      });
      expect(records.create).not.toHaveBeenCalled();
      expect(versions.uploadVersion).not.toHaveBeenCalled();
    });

    it('rejects files over the size limit before storing anything', async () => {
      prisma.application.findFirst.mockResolvedValue(application(ApplicationStatus.DRAFT));
      const oversize = Buffer.alloc(10 * 1024 * 1024 + 1).toString('base64');

      await expect(
        service.upload(session, APPLICATION_ID, { ...dto, contentBase64: oversize }),
      ).rejects.toBeInstanceOf(PayloadTooLargeException);
      expect(versions.uploadVersion).not.toHaveBeenCalled();
    });

    it('stores a draft upload as an unverified applicant upload linked to the application', async () => {
      prisma.application.findFirst.mockResolvedValue(application(ApplicationStatus.DRAFT));

      const result = await service.upload(session, APPLICATION_ID, dto);

      expect(records.create).toHaveBeenCalledWith(
        expect.objectContaining({ sourceType: DocumentSourceType.APPLICANT_UPLOAD }),
      );
      expect(versions.uploadVersion).toHaveBeenCalledWith(
        expect.objectContaining({ documentRecordId: 'doc-1', actorIdentityId: ME }),
      );
      expect(associations.associate).toHaveBeenCalledWith(
        expect.objectContaining({ targetType: 'APPLICATION', targetId: APPLICATION_ID }),
        ME,
      );
      expect(result).toMatchObject({
        authenticityStatus: DocumentAuthenticityStatus.NOT_EVALUATED,
        duplicate: false,
      });
    });

    it('accepts uploads while the case is waiting for the applicant', async () => {
      prisma.application.findFirst.mockResolvedValue(
        application(ApplicationStatus.SUBMITTED, CaseStatus.WAITING_APPLICANT),
      );

      await expect(service.upload(session, APPLICATION_ID, dto)).resolves.toMatchObject({
        documentVersionId: 'version-1',
      });
    });

    it('a retried upload of the same file returns the first upload without storing again', async () => {
      prisma.application.findFirst.mockResolvedValue(application(ApplicationStatus.DRAFT));
      prisma.documentVersion.findFirst.mockResolvedValue({
        ...storedVersion,
        documentRecord: {
          id: 'doc-0',
          documentNumber: 'DOC-0',
          title: dto.title,
          documentType: dto.documentType,
        },
      });

      const result = await service.upload(session, APPLICATION_ID, dto);

      expect(result).toMatchObject({ documentId: 'doc-0', duplicate: true });
      expect(versions.uploadVersion).not.toHaveBeenCalled();
    });
  });

  describe('communication preferences', () => {
    const tx = {
      $executeRaw: jest.fn(),
      communicationPreference: { findFirst: jest.fn(), update: jest.fn(), create: jest.fn() },
    };
    const prisma = {
      communicationPreference: { findMany: jest.fn() },
      $transaction: jest.fn((fn: (client: typeof tx) => unknown) => fn(tx)),
    };
    const service = new CitizenCommunicationPreferencesService(
      prisma as unknown as PrismaService,
      audit,
    );

    it('writes only the session identity preferences', async () => {
      tx.communicationPreference.findFirst.mockResolvedValue(null);
      prisma.communicationPreference.findMany.mockResolvedValue([]);

      await service.update(session, {
        preferences: [{ channelType: 'SMS', isEnabled: false }],
      });

      expect(tx.communicationPreference.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ identityId: ME, channelType: 'SMS', isEnabled: false }),
      });
      expect(prisma.communicationPreference.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { identityId: ME, institutionId: null } }),
      );
    });

    it('rejects the same channel twice', async () => {
      await expect(
        service.update(session, {
          preferences: [
            { channelType: 'EMAIL', isEnabled: true },
            { channelType: 'EMAIL', isEnabled: false },
          ],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
