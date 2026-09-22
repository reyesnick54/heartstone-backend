import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CivilRegistryAccessClassification } from '@prisma/client';

import { HIGHLY_PROTECTED_ACCESS_CLASSIFICATIONS } from '../civil-registry.constants';

export interface CivilRegistryAccessContext {
  actorIdentityId: string;
  linkedSubjectIdentityId?: string | null;
  isAuthorizedGovernmentActor?: boolean;
  accessClassification: CivilRegistryAccessClassification;
}

@Injectable()
export class CivilRegistryClassificationAccessService {
  resolveEffectiveClassification(input: {
    entryClassification: CivilRegistryAccessClassification;
    restrictions: CivilRegistryAccessClassification[];
  }): CivilRegistryAccessClassification {
    const order: CivilRegistryAccessClassification[] = [
      CivilRegistryAccessClassification.SEALED,
      CivilRegistryAccessClassification.RESTRICTED,
      CivilRegistryAccessClassification.AUTHORIZED_GOVERNMENT,
      CivilRegistryAccessClassification.SUBJECT_ACCESS,
      CivilRegistryAccessClassification.PUBLIC_VERIFICATION_ONLY,
    ];

    const candidates = [input.entryClassification, ...input.restrictions];
    for (const level of order) {
      if (candidates.includes(level)) {
        return level;
      }
    }

    return input.entryClassification;
  }

  assertMayReadEntry(context: CivilRegistryAccessContext): void {
    const { accessClassification } = context;

    if (HIGHLY_PROTECTED_ACCESS_CLASSIFICATIONS.includes(accessClassification)) {
      if (context.isAuthorizedGovernmentActor) {
        return;
      }
      throw new ForbiddenException(
        'Restricted or sealed civil record is not exposed to this actor',
      );
    }

    if (accessClassification === CivilRegistryAccessClassification.AUTHORIZED_GOVERNMENT) {
      if (!context.isAuthorizedGovernmentActor) {
        throw new ForbiddenException('Record requires authorized government access');
      }
      return;
    }

    if (accessClassification === CivilRegistryAccessClassification.SUBJECT_ACCESS) {
      const isSubject =
        context.linkedSubjectIdentityId != null &&
        context.actorIdentityId === context.linkedSubjectIdentityId;

      if (!isSubject && !context.isAuthorizedGovernmentActor) {
        throw new ForbiddenException('Cross-citizen civil registry access is not permitted');
      }
    }
  }

  assertPublicVerificationOnlyPayload(payload: Record<string, unknown>): Record<string, unknown> {
    return {
      entryReference: payload.entryReference,
      verificationState: payload.verificationState,
      registeredAt: payload.registeredAt,
    };
  }

  maskOrThrow<T extends Record<string, unknown>>(
    context: CivilRegistryAccessContext,
    payload: T,
  ): T | Record<string, unknown> {
    try {
      this.assertMayReadEntry(context);
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw new NotFoundException('Civil registry record not found');
      }
      throw error;
    }

    if (
      context.accessClassification === CivilRegistryAccessClassification.PUBLIC_VERIFICATION_ONLY
    ) {
      return this.assertPublicVerificationOnlyPayload(payload);
    }

    return payload;
  }
}
