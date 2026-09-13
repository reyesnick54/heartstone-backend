import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentSession } from '../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../identity/auth/guards/session-auth.guard';
import { EvidenceClientAssertionForbiddenException } from './common/exceptions/evidence.exceptions';
import { FORBIDDEN_CLIENT_EVIDENCE_FIELDS } from './evidence.constants';
import { ReceiveEvidenceDto } from './records/dto/receive-evidence.dto';
import { EvidenceRecordsService } from './records/evidence-records.service';
import {
  LinkEvidenceRequirementDto,
  ProposeEvidenceQualityAssessmentDto,
  RecordEvidencePurposeAcceptanceDto,
} from './requirements/dto/evidence-governance.dto';
import {
  EvidencePurposeAcceptanceService,
  EvidenceQualityAssessmentService,
  EvidenceRequirementLinkService,
} from './requirements/evidence-governance.service';
import { RecordEvidenceVerificationDto } from './verification/dto/record-evidence-verification.dto';
import { EvidenceVerificationService } from './verification/evidence-verification.service';

@ApiTags('evidence')
@ApiBearerAuth()
@UseGuards(SessionAuthGuard)
@Controller('evidence')
export class EvidenceController {
  constructor(
    private readonly evidenceRecords: EvidenceRecordsService,
    private readonly evidenceVerification: EvidenceVerificationService,
    private readonly requirementLinks: EvidenceRequirementLinkService,
    private readonly purposeAcceptance: EvidencePurposeAcceptanceService,
    private readonly qualityAssessment: EvidenceQualityAssessmentService,
  ) {}

  @Post('records')
  receiveEvidence(@CurrentSession() session: SessionContextDto, @Body() dto: ReceiveEvidenceDto) {
    this.rejectForbiddenClientFields(dto as unknown as Record<string, unknown>);
    return this.evidenceRecords.receiveEvidence(session.identityId, dto);
  }

  @Get('records/:id')
  getEvidence(@Param('id', ParseUUIDPipe) id: string) {
    return this.evidenceRecords.getById(id);
  }

  @Post('records/:id/verifications')
  recordVerification(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordEvidenceVerificationDto,
  ) {
    this.rejectForbiddenClientFields(dto as unknown as Record<string, unknown>);
    return this.evidenceVerification.recordVerification(id, session.identityId, dto);
  }

  @Post('records/:id/requirement-links')
  linkRequirement(@Param('id', ParseUUIDPipe) id: string, @Body() dto: LinkEvidenceRequirementDto) {
    return this.requirementLinks.linkRequirement(id, dto);
  }

  @Post('records/:id/purpose-acceptances')
  recordPurposeAcceptance(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordEvidencePurposeAcceptanceDto,
  ) {
    return this.purposeAcceptance.recordAcceptance(id, session.identityId, dto);
  }

  @Post('records/:id/quality-assessments/official')
  recordOfficialQuality(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ProposeEvidenceQualityAssessmentDto,
  ) {
    return this.qualityAssessment.recordOfficialAssessment(id, session.identityId, dto);
  }

  @Post('records/:id/quality-assessments/ai-proposals')
  proposeAiQuality(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ProposeEvidenceQualityAssessmentDto,
  ) {
    return this.qualityAssessment.proposeAssessment(id, session.identityId, dto);
  }

  @Post('quality-assessments/:assessmentId/finalize')
  finalizeQuality(
    @CurrentSession() session: SessionContextDto,
    @Param('assessmentId', ParseUUIDPipe) assessmentId: string,
  ) {
    return this.qualityAssessment.finalizeAssessment(assessmentId, session.identityId);
  }

  private rejectForbiddenClientFields(payload: Record<string, unknown>) {
    for (const field of FORBIDDEN_CLIENT_EVIDENCE_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new EvidenceClientAssertionForbiddenException(field);
      }
    }
  }
}

@ApiTags('evidence-ai')
@ApiBearerAuth()
@UseGuards(SessionAuthGuard)
@Controller('evidence/ai')
export class EvidenceAiController {
  constructor(private readonly evidenceVerification: EvidenceVerificationService) {}

  @Post('records/:id/verification-proposals')
  proposeVerification(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordEvidenceVerificationDto,
  ) {
    return this.evidenceVerification.recordVerification(id, session.identityId, dto, {
      isAiActor: true,
    });
  }

  @Post('records/:id/purpose-acceptances')
  proposePurposeAcceptance() {
    throw new ForbiddenException('AI assistance cannot finalize evidence purpose acceptance');
  }
}
