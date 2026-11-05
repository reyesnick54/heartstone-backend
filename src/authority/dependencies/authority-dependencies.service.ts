import { Injectable, NotFoundException } from '@nestjs/common';

import { GOVERNMENT_AUDIT_EVENT_TYPES } from '../../audit-governance/audit-governance.constants';
import { GovernmentAuditLedgerService } from '../../audit-governance/ledger/government-audit-ledger.service';
import { PrismaService } from '../../database/prisma.service';
import { type VerifiedExternalDependencyResult } from '../contracts/verified-external-dependency-result.contract';
import { type RecordInstitutionalActDto } from './dto/record-institutional-act.dto';
import { type RegisterExternalDeterminationDto } from './dto/register-external-determination.dto';

/** The signed-in officer entering the record; taken from the session, never the request. */
export interface DependencyRecorder {
  recordedByIdentityId: string;
  sessionId?: string;
}

@Injectable()
export class AuthorityDependenciesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLedger: GovernmentAuditLedgerService,
  ) {}

  async registerExternalDetermination(
    dto: RegisterExternalDeterminationDto,
    recorder: DependencyRecorder,
  ): Promise<VerifiedExternalDependencyResult> {
    const dependency = await this.prisma.authorityDependency.findUnique({
      where: { id: dto.authorityDependencyId },
    });
    if (!dependency) {
      throw new NotFoundException(
        `Authority dependency with id "${dto.authorityDependencyId}" was not found`,
      );
    }

    const externalAuthority = await this.prisma.externalAuthority.findUnique({
      where: { id: dto.externalAuthorityId },
    });
    if (!externalAuthority) {
      throw new NotFoundException(
        `External authority with id "${dto.externalAuthorityId}" was not found`,
      );
    }

    const record = await this.prisma.externalDependencyDetermination.create({
      data: {
        authorityDependencyId: dto.authorityDependencyId,
        externalAuthorityId: dto.externalAuthorityId,
        determinationReference: dto.determinationReference,
        determinationStatus: dto.determinationStatus,
        effectiveDate: dto.effectiveDate,
        expiryDate: dto.expiryDate,
        isAuthenticated: dto.isAuthenticated,
        scope: dto.scope,
        retainedQuestion: dto.retainedQuestion,
        requiredDetermination: dto.requiredDetermination,
        referralBasis: dto.referralBasis,
        effectOnInstitutionAction: dto.effectOnInstitutionAction,
      },
    });

    await this.auditLedger.append({
      eventType: GOVERNMENT_AUDIT_EVENT_TYPES.ADMINISTRATIVE_CHANGE,
      actorIdentityId: recorder.recordedByIdentityId,
      sessionId: recorder.sessionId,
      action: 'RECORD_EXTERNAL_DETERMINATION',
      outcome: 'RECORDED',
      resourceType: 'ExternalDependencyDetermination',
      resourceId: record.id,
      metadata: {
        authorityDependencyId: dto.authorityDependencyId,
        externalAuthorityId: dto.externalAuthorityId,
        determinationReference: dto.determinationReference,
        determinationStatus: dto.determinationStatus,
        isAuthenticated: dto.isAuthenticated,
      },
      sourceDomainEventType: 'ExternalDependencyDetermination',
      sourceDomainEventId: record.id,
    });

    return {
      authorityDependencyId: record.authorityDependencyId,
      externalAuthorityId: record.externalAuthorityId,
      determinationReference: record.determinationReference,
      determinationStatus: record.determinationStatus,
      effectiveDate: record.effectiveDate ?? undefined,
      expiryDate: record.expiryDate ?? undefined,
      isAuthenticated: record.isAuthenticated,
      scope: record.scope ?? undefined,
      receivedAt: record.receivedAt,
      retainedQuestion: record.retainedQuestion ?? undefined,
      requiredDetermination: record.requiredDetermination ?? undefined,
      referralBasis: record.referralBasis ?? undefined,
      effectOnInstitutionAction: record.effectOnInstitutionAction ?? undefined,
    };
  }

  async recordInstitutionalAct(dto: RecordInstitutionalActDto, recorder: DependencyRecorder) {
    const functionRecord = await this.prisma.functionAuthorityRecord.findUnique({
      where: { id: dto.functionAuthorityRecordId },
    });
    if (!functionRecord) {
      throw new NotFoundException(
        `FunctionAuthorityRecord "${dto.functionAuthorityRecordId}" was not found`,
      );
    }

    const act = await this.prisma.institutionalAuthorityAct.create({
      data: {
        functionAuthorityRecordId: dto.functionAuthorityRecordId,
        institutionId: dto.institutionId,
        externalAuthorityId: dto.externalAuthorityId,
        actorOfficeholderId: dto.actorOfficeholderId,
        actorIdentityId: dto.actorIdentityId,
        actType: dto.actType,
        decisionOrAction: dto.decisionOrAction,
        evidenceReference: dto.evidenceReference,
        legalEffect: dto.legalEffect,
        performedAt: dto.performedAt ?? new Date(),
      },
    });

    await this.auditLedger.append({
      eventType: GOVERNMENT_AUDIT_EVENT_TYPES.ADMINISTRATIVE_CHANGE,
      actorIdentityId: recorder.recordedByIdentityId,
      sessionId: recorder.sessionId,
      action: 'RECORD_INSTITUTIONAL_ACT',
      outcome: 'RECORDED',
      resourceType: 'InstitutionalAuthorityAct',
      resourceId: act.id,
      metadata: {
        functionAuthorityRecordId: dto.functionAuthorityRecordId,
        institutionId: dto.institutionId ?? null,
        actType: dto.actType,
        performedByIdentityId: dto.actorIdentityId ?? null,
        performedByOfficeholderId: dto.actorOfficeholderId ?? null,
        evidenceReference: dto.evidenceReference ?? null,
      },
      sourceDomainEventType: 'InstitutionalAuthorityAct',
      sourceDomainEventId: act.id,
    });

    return act;
  }
}
