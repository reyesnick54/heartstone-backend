import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { EvidencePurposeType, LegalHoldTargetType } from '@prisma/client';

import { CurrentSession } from '../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../identity/auth/guards/session-auth.guard';
import { EvidenceRecordsAccessService } from './common/evidence-records-access.service';
import { GovernmentCommunicationRecordsService } from './communications/government-communication-records.service';
import { RecordCorrectionsService } from './corrections/record-corrections.service';
import { DocumentRecordsService } from './documents/document-records.service';
import { EvidenceRecordsService } from './evidence/evidence-records.service';
import { InspectionRecordsService } from './inspections/inspection-records.service';
import { LegalHoldsService } from './legal-holds/legal-holds.service';
import { MasterFilesService } from './master-files/master-files.service';
import { EvidencePacketsService } from './packets/evidence-packets.service';
import { ProfessionalReviewRecordsService } from './professional/professional-review-records.service';

@ApiTags('evidence-records')
@Controller()
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class EvidenceRecordsController {
  constructor(
    private readonly access: EvidenceRecordsAccessService,
    private readonly masterFiles: MasterFilesService,
    private readonly documents: DocumentRecordsService,
    private readonly evidence: EvidenceRecordsService,
    private readonly packets: EvidencePacketsService,
    private readonly corrections: RecordCorrectionsService,
    private readonly legalHolds: LegalHoldsService,
    private readonly inspections: InspectionRecordsService,
    private readonly professionalReviews: ProfessionalReviewRecordsService,
    private readonly governmentCommunications: GovernmentCommunicationRecordsService,
  ) {}

  @Post('cases/:caseId/master-file')
  openMasterFile(
    @CurrentSession() session: SessionContextDto,
    @Param('caseId', ParseUUIDPipe) caseId: string,
    @Body() body: { title?: string; institutionId?: string },
  ) {
    return this.masterFiles.openForCase({
      caseId,
      actorIdentityId: session.identityId,
      title: body.title,
      institutionId: body.institutionId,
    });
  }

  @Post('master-files/:id/documents')
  async registerDocument(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) masterFileId: string,
    @Body()
    body: {
      title: string;
      description?: string;
      sectionKey?: string;
      content: string;
      mimeType?: string;
    },
  ) {
    const isOfficial = await this.access.isOfficialIdentity(session.identityId);
    return this.documents.register({
      masterAdministrativeFileId: masterFileId,
      actorIdentityId: session.identityId,
      isOfficial,
      ...body,
      clientPayload: body as Record<string, unknown>,
    });
  }

  @Post('master-files/:id/evidence')
  async registerEvidence(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) masterFileId: string,
    @Body()
    body: {
      title: string;
      description?: string;
      documentRecordId?: string;
      requirementCode?: string;
      requirementLabel?: string;
    },
  ) {
    const isOfficial = await this.access.isOfficialIdentity(session.identityId);
    return this.evidence.register({
      masterAdministrativeFileId: masterFileId,
      actorIdentityId: session.identityId,
      isOfficial,
      ...body,
      clientPayload: body as Record<string, unknown>,
    });
  }

  @Get('evidence/:id')
  async getEvidence(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const isOfficial = await this.access.isOfficialIdentity(session.identityId);
    return this.evidence.findById(id, session.identityId, isOfficial);
  }

  @Post('evidence/:id/verify')
  async verifyEvidence(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { officeholderId?: string; findings?: string; isAiAssisted?: boolean },
  ) {
    const isOfficial = await this.access.isOfficialIdentity(session.identityId);
    return this.evidence.verify({
      evidenceRecordId: id,
      actorIdentityId: session.identityId,
      isApplicant: !isOfficial,
      officeholderId: body.officeholderId,
      findings: body.findings,
      isAiAssisted: body.isAiAssisted,
    });
  }

  @Post('evidence/:id/accept')
  async acceptEvidence(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    body: {
      purposeType: EvidencePurposeType;
      officeholderId?: string;
      notes?: string;
    },
  ) {
    const isOfficial = await this.access.isOfficialIdentity(session.identityId);
    return this.evidence.acceptForPurpose({
      evidenceRecordId: id,
      actorIdentityId: session.identityId,
      isApplicant: !isOfficial,
      purposeType: body.purposeType,
      officeholderId: body.officeholderId,
      notes: body.notes,
    });
  }

  @Post('evidence/:id/dispute')
  async disputeEvidence(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { reason: string },
  ) {
    const isOfficial = await this.access.isOfficialIdentity(session.identityId);
    return this.evidence.dispute({
      evidenceRecordId: id,
      actorIdentityId: session.identityId,
      isOfficial,
      reason: body.reason,
    });
  }

  @Post('master-files/:id/packets')
  async createPacket(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) masterFileId: string,
    @Body() body: { title: string },
  ) {
    const isOfficial = await this.access.isOfficialIdentity(session.identityId);
    return this.packets.create({
      masterAdministrativeFileId: masterFileId,
      actorIdentityId: session.identityId,
      isOfficial,
      title: body.title,
      clientPayload: body as Record<string, unknown>,
    });
  }

  @Post('packets/:id/items')
  async addPacketItem(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) packetId: string,
    @Body()
    body: {
      evidenceRecordId: string;
      sequenceNumber: number;
      purposeType?: EvidencePurposeType;
    },
  ) {
    const isOfficial = await this.access.isOfficialIdentity(session.identityId);
    return this.packets.addEvidence({
      packetId,
      actorIdentityId: session.identityId,
      isOfficial,
      ...body,
    });
  }

  @Post('packets/:id/freeze')
  async freezePacket(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) packetId: string,
  ) {
    const isOfficial = await this.access.isOfficialIdentity(session.identityId);
    return this.packets.freeze({
      packetId,
      actorIdentityId: session.identityId,
      isOfficial,
    });
  }

  @Post('record-corrections')
  requestCorrection(
    @CurrentSession() session: SessionContextDto,
    @Body()
    body: {
      targetRecordType: string;
      targetRecordId: string;
      reason: string;
      correctionPayload: Record<string, unknown>;
    },
  ) {
    return this.corrections.requestCorrection({
      actorIdentityId: session.identityId,
      ...body,
    });
  }

  @Post('record-corrections/:id/approve')
  approveCorrection(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.corrections.approve(id, session.identityId);
  }

  @Post('record-corrections/:id/apply')
  applyCorrection(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    body: {
      functionAuthorityRecordId?: string;
      officeholderId?: string;
      officeId?: string;
      appointmentId?: string;
      delegationId?: string;
    },
  ) {
    const authority = body?.functionAuthorityRecordId
      ? {
          functionAuthorityRecordId: body.functionAuthorityRecordId,
          officeholderId: body.officeholderId,
          officeId: body.officeId,
          appointmentId: body.appointmentId,
          delegationId: body.delegationId,
        }
      : undefined;

    return this.corrections.apply(id, session.identityId, authority);
  }

  @Post('legal-holds')
  createLegalHold(
    @CurrentSession() session: SessionContextDto,
    @Body()
    body: {
      title: string;
      reason: string;
      targetType: LegalHoldTargetType;
      masterAdministrativeFileId?: string;
      documentRecordId?: string;
      evidenceRecordId?: string;
      evidencePacketId?: string;
    },
  ) {
    return this.legalHolds.create({
      actorIdentityId: session.identityId,
      ...body,
    });
  }

  @Post('inspections')
  scheduleInspection(
    @Body()
    body: {
      masterAdministrativeFileId: string;
      inspectorOfficeholderId?: string;
      scheduledAt?: string;
    },
  ) {
    return this.inspections.schedule({
      masterAdministrativeFileId: body.masterAdministrativeFileId,
      inspectorOfficeholderId: body.inspectorOfficeholderId,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
    });
  }

  @Post('inspections/:id/custody-transfers')
  recordCustodyTransfer(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) _inspectionId: string,
    @Body()
    body: {
      evidenceRecordId: string;
      actorOfficeholderId?: string;
      fromLocationRef: string;
      toLocationRef: string;
      occurredAt?: string;
    },
  ) {
    return this.inspections.recordCustodyTransfer({
      evidenceRecordId: body.evidenceRecordId,
      actorIdentityId: session.identityId,
      actorOfficeholderId: body.actorOfficeholderId,
      fromLocationRef: body.fromLocationRef,
      toLocationRef: body.toLocationRef,
      occurredAt: body.occurredAt ? new Date(body.occurredAt) : undefined,
    });
  }

  @Post('professional-reviews')
  createProfessionalReview(
    @Body()
    body: {
      masterAdministrativeFileId: string;
      externalAuthorityId?: string;
      reviewerReference?: string;
      findings?: string;
    },
  ) {
    return this.professionalReviews.create(body);
  }

  @Post('government-communications')
  recordGovernmentCommunication(
    @Body()
    body: {
      masterAdministrativeFileId: string;
      caseCommunicationId?: string;
      channel: string;
      subject?: string;
      body: string;
    },
  ) {
    return this.governmentCommunications.record({
      masterAdministrativeFileId: body.masterAdministrativeFileId,
      caseCommunicationId: body.caseCommunicationId,
      channel: body.channel as never,
      subject: body.subject,
      body: body.body,
    });
  }
}
