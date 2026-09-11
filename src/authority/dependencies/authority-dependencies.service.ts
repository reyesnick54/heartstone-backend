import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { type VerifiedExternalDependencyResult } from '../contracts/verified-external-dependency-result.contract';
import { type RecordInstitutionalActDto } from './dto/record-institutional-act.dto';
import { type RegisterExternalDeterminationDto } from './dto/register-external-determination.dto';

@Injectable()
export class AuthorityDependenciesService {
  constructor(private readonly prisma: PrismaService) {}

  async registerExternalDetermination(
    dto: RegisterExternalDeterminationDto,
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
        effectOnAbsezAction: dto.effectOnAbsezAction,
      },
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
      effectOnAbsezAction: record.effectOnAbsezAction ?? undefined,
    };
  }

  async recordInstitutionalAct(dto: RecordInstitutionalActDto) {
    const functionRecord = await this.prisma.functionAuthorityRecord.findUnique({
      where: { id: dto.functionAuthorityRecordId },
    });
    if (!functionRecord) {
      throw new NotFoundException(
        `FunctionAuthorityRecord "${dto.functionAuthorityRecordId}" was not found`,
      );
    }

    return this.prisma.institutionalAuthorityAct.create({
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
  }
}
