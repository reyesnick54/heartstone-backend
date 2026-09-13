import { createHash, randomBytes } from 'node:crypto';

import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CaseEventPublicVisibility,
  CaseEventType,
  CaseStatus,
  CatalogLifecycleStatus,
  DocumentAssociationRole,
  DocumentAssociationTargetType,
  DocumentSourceType,
  InstrumentIssuerSource,
  IssuanceEventStatus,
  IssuanceReadinessOutcome,
  OfficialInstrumentStatus,
  Prisma,
} from '@prisma/client';

import { CaseStatusService } from '../../application-processing/cases/case-status.service';
import { PrismaService } from '../../database/prisma.service';
import {
  DOCUMENT_STORAGE_PORT,
  DocumentStoragePort,
} from '../../evidence-records/ports/document-storage.port';
import { InstrumentNumberingService } from '../catalog/instrument-numbering.service';
import {
  IssuanceBlockedException,
  IssuanceNotReadyException,
  RetainedNationalIssuanceException,
} from '../common/exceptions/issuance.exceptions';
import { renderInstrumentTemplate } from '../common/template-renderer.util';
import { validateFreeFormFields } from '../common/template-sanitizer.util';
import {
  FORBIDDEN_CLIENT_ISSUANCE_FIELDS,
  INSTRUMENT_NUMBER_PREFIX,
} from '../decisions-issuance.constants';
import {
  type IssuanceReadinessInput,
  IssuanceReadinessService,
} from './issuance-readiness.service';

export interface IssueOfficialInstrumentInput extends IssuanceReadinessInput {
  idempotencyKey?: string;
  controlledFields?: Record<string, string>;
  computedFields?: Record<string, string>;
  freeFormFields?: Record<string, unknown>;
}

@Injectable()
export class IssuanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly readiness: IssuanceReadinessService,
    private readonly numbering: InstrumentNumberingService,
    private readonly caseStatus: CaseStatusService,
    @Inject(DOCUMENT_STORAGE_PORT)
    private readonly storage: DocumentStoragePort,
  ) {}

  rejectClientIssuanceFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CLIENT_ISSUANCE_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(`Client may not set "${field}"`);
      }
    }
  }

  async issue(input: IssueOfficialInstrumentInput): Promise<{
    issuanceEvent: Awaited<ReturnType<PrismaService['issuanceEvent']['create']>>;
    instrument: Awaited<ReturnType<PrismaService['officialInstrument']['update']>>;
    instrumentVersion: Awaited<ReturnType<PrismaService['officialInstrumentVersion']['create']>>;
  }> {
    this.rejectClientIssuanceFields(input as unknown as Record<string, unknown>);

    if (input.idempotencyKey) {
      const existing = await this.prisma.issuanceEvent.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        include: { officialInstrument: true },
      });
      if (existing?.status === IssuanceEventStatus.COMPLETED) {
        const instrument = await this.prisma.officialInstrument.findUnique({
          where: { id: existing.officialInstrumentId },
        });
        const instrumentVersion = await this.prisma.officialInstrumentVersion.findUnique({
          where: { id: existing.officialInstrumentVersionId },
        });
        if (!instrument || !instrumentVersion) {
          throw new NotFoundException('Idempotent issuance record is incomplete');
        }
        return { issuanceEvent: existing, instrument, instrumentVersion };
      }
    }

    const readiness = await this.readiness.assess(input);
    if (readiness.outcome !== IssuanceReadinessOutcome.READY) {
      throw new IssuanceNotReadyException(
        'Issuance readiness checks did not pass',
        Object.fromEntries(readiness.checklistResults.map((c) => [c.code, c])),
      );
    }

    const typeVersion = await this.prisma.instrumentTypeVersion.findUnique({
      where: { id: input.instrumentTypeVersionId },
      include: {
        requiredTemplateVersion: { include: { instrumentTemplate: true } },
        numberingRule: true,
        issuingInstitution: true,
        instrumentTypeDefinition: true,
      },
    });

    if (!typeVersion) {
      throw new NotFoundException('Instrument type version not found');
    }

    if (
      typeVersion.retainedNationalBoundary &&
      input.issuerSource !== InstrumentIssuerSource.RETAINED_NATIONAL_COORDINATED &&
      input.issuerSource !== InstrumentIssuerSource.EXTERNAL_AUTHENTICATED
    ) {
      throw new RetainedNationalIssuanceException(
        'Retained-national instruments cannot be issued as ABSEZ-issued instruments',
      );
    }

    if (typeVersion.lifecycleStatus !== CatalogLifecycleStatus.ACTIVE) {
      throw new IssuanceBlockedException('Instrument type version is not active', 'TYPE_INACTIVE');
    }

    const decision = await this.prisma.governmentDecision.findUnique({
      where: { id: input.governmentDecisionId },
      include: { conditions: true },
    });

    if (!decision) {
      throw new NotFoundException('Government decision not found');
    }

    const caseRecord = await this.prisma.case.findUnique({
      where: { id: input.caseId },
      include: { masterAdministrativeFile: true },
    });

    const masterAdministrativeFile = caseRecord?.masterAdministrativeFile;
    if (!caseRecord || !masterAdministrativeFile) {
      throw new BadRequestException('Master Administrative File must exist before issuance');
    }

    const authorityEvaluationRecordId = readiness.authorityEvaluationRecordId;
    if (!authorityEvaluationRecordId) {
      throw new IssuanceBlockedException(
        'Fresh ISSUE authority evaluation is required',
        'MISSING_AUTHORITY_EVALUATION',
      );
    }

    const templateVersion = typeVersion.requiredTemplateVersion;
    if (!templateVersion) {
      throw new BadRequestException('Instrument type version has no required template version');
    }

    const allowedFreeForm = Array.isArray(templateVersion.freeFormFields)
      ? (templateVersion.freeFormFields as string[])
      : [];
    const sanitizedFreeForm = validateFreeFormFields(input.freeFormFields ?? {}, allowedFreeForm);

    const controlledFields = {
      ...(input.controlledFields ?? {}),
      instrumentType: typeVersion.instrumentTypeDefinition.kind,
      instrumentTypeName: typeVersion.instrumentTypeDefinition.name,
      decisionNumber: decision.decisionNumber,
      matterDecided: decision.matterDecided,
      caseNumber: caseRecord.caseNumber,
    };

    const { renderedContent, contentHash } = renderInstrumentTemplate({
      contentTemplate: templateVersion.contentTemplate,
      controlledFields,
      computedFields: input.computedFields ?? {},
      freeFormFields: sanitizedFreeForm,
    });

    const verificationCode = createHash('sha256')
      .update(randomBytes(32))
      .digest('hex')
      .slice(0, 16)
      .toUpperCase();

    const result = await this.prisma.$transaction(async (tx) => {
      const { reservationId, reservedNumber } = await this.numbering.reserveNextNumber(
        typeVersion.numberingRuleId,
        typeVersion.issuingInstitution.code,
        tx,
      );

      const instrument = await tx.officialInstrument.create({
        data: {
          instrumentTypeVersionId: input.instrumentTypeVersionId,
          governmentDecisionId: input.governmentDecisionId,
          caseId: input.caseId,
          masterAdministrativeFileId: masterAdministrativeFile.id,
          holderIdentityId: input.holderIdentityId,
          holderOrganizationId: input.holderOrganizationId,
          issuerInstitutionId: typeVersion.issuingInstitutionId,
          issuerOfficeholderId: input.issuerOfficeholderId,
          issuerSource: input.issuerSource ?? InstrumentIssuerSource.ABSEZ_ISSUED,
          externalIssuerReference: input.externalIssuerReference,
          scope: (input.scope ?? {}) as Prisma.InputJsonValue,
          status: OfficialInstrumentStatus.PENDING_ISSUANCE,
          effectiveFrom: input.effectiveFrom,
          effectiveUntil: input.effectiveUntil,
          verificationCode,
        },
      });

      const documentNumber = `${INSTRUMENT_NUMBER_PREFIX}-DOC-${reservedNumber}`;
      const documentRecord = await tx.documentRecord.create({
        data: {
          documentNumber,
          title: `${typeVersion.instrumentTypeDefinition.name} - ${reservedNumber}`,
          documentType: typeVersion.instrumentTypeDefinition.kind,
          sourceType: DocumentSourceType.SYSTEM_GENERATED,
          owningInstitutionId: typeVersion.issuingInstitutionId,
        },
      });

      const contentBuffer = Buffer.from(renderedContent, 'utf8');
      const storageObjectKey = `instruments/${instrument.id}/${contentHash}`;
      const stored = await this.storage.put({
        objectKey: storageObjectKey,
        content: contentBuffer,
        contentType: 'text/plain',
        metadata: {
          officialInstrumentId: instrument.id,
          contentHash,
        },
      });

      const documentVersion = await tx.documentVersion.create({
        data: {
          documentRecordId: documentRecord.id,
          versionNumber: 1,
          originalFilename: `${reservedNumber}.txt`,
          contentType: 'text/plain',
          sizeBytes: contentBuffer.length,
          storageProvider: stored.storageProvider,
          storageObjectKey: stored.storageObjectKey,
          sha256: contentHash,
          signatureStatus: typeVersion.signatureRequired ? 'SIGNED' : 'NOT_EVALUATED',
          sealStatus: typeVersion.sealRequired ? 'SEALED' : 'NOT_EVALUATED',
        },
      });

      const instrumentVersion = await tx.officialInstrumentVersion.create({
        data: {
          officialInstrumentId: instrument.id,
          versionNumber: 1,
          templateVersionId: templateVersion.id,
          documentRecordId: documentRecord.id,
          documentVersionId: documentVersion.id,
          contentHash,
          governmentDecisionId: input.governmentDecisionId,
          conditionsSnapshot: decision.conditions,
          signatureRecord: input.signatureDocumentVersionId
            ? { documentVersionId: input.signatureDocumentVersionId }
            : undefined,
          sealRecord: input.sealDocumentVersionId
            ? { documentVersionId: input.sealDocumentVersionId }
            : undefined,
        },
      });

      const updatedInstrument = await tx.officialInstrument.update({
        where: { id: instrument.id },
        data: {
          instrumentNumber: reservedNumber,
          status: OfficialInstrumentStatus.ISSUED,
          currentVersionId: instrumentVersion.id,
        },
      });

      await this.numbering.commitReservation(reservationId, instrument.id, tx);

      const issuanceEvent = await tx.issuanceEvent.create({
        data: {
          officialInstrumentId: instrument.id,
          officialInstrumentVersionId: instrumentVersion.id,
          governmentDecisionId: input.governmentDecisionId,
          caseId: input.caseId,
          issuerOfficeholderId: input.issuerOfficeholderId,
          issuerIdentityId: input.issuerIdentityId,
          authorityEvaluationRecordId,
          instrumentNumber: reservedNumber,
          numberingReservationId: reservationId,
          status: IssuanceEventStatus.COMPLETED,
          idempotencyKey: input.idempotencyKey,
          completedAt: new Date(),
        },
      });

      await tx.documentAssociation.create({
        data: {
          documentRecordId: documentRecord.id,
          documentVersionId: documentVersion.id,
          targetType: DocumentAssociationTargetType.MASTER_ADMINISTRATIVE_FILE,
          targetId: masterAdministrativeFile.id,
          associationRole: DocumentAssociationRole.OFFICIAL_RECORD,
          associatedByIdentityId: input.issuerIdentityId,
        },
      });

      await tx.documentAssociation.create({
        data: {
          documentRecordId: documentRecord.id,
          documentVersionId: documentVersion.id,
          targetType: DocumentAssociationTargetType.OFFICIAL_INSTRUMENT,
          targetId: instrument.id,
          associationRole: DocumentAssociationRole.OFFICIAL_RECORD,
          associatedByIdentityId: input.issuerIdentityId,
        },
      });

      await tx.caseEvent.create({
        data: {
          caseId: input.caseId,
          eventType: CaseEventType.INSTRUMENT_ISSUED,
          actorIdentityId: input.issuerIdentityId,
          officeholderId: input.issuerOfficeholderId,
          publicVisibility: CaseEventPublicVisibility.OFFICIAL,
          payload: {
            instrumentId: instrument.id,
            instrumentNumber: reservedNumber,
            instrumentKind: typeVersion.instrumentTypeDefinition.kind,
          },
        },
      });

      return { issuanceEvent, instrument: updatedInstrument, instrumentVersion };
    });

    await this.caseStatus.transition(
      input.caseId,
      CaseStatus.ISSUED,
      'Official instrument issued',
      input.issuerIdentityId,
    );

    return result;
  }
}
