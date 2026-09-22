import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PropertyRegistryAccessClassification } from '@prisma/client';

import { HIGHLY_PROTECTED_ACCESS_CLASSIFICATIONS } from '../property-registry.constants';

export interface PropertyRegistryAccessContext {
  actorIdentityId: string;
  linkedSubjectIdentityId?: string | null;
  isAuthorizedProfessional?: boolean;
  isAuthorizedGovernmentActor?: boolean;
  accessClassification: PropertyRegistryAccessClassification;
}

@Injectable()
export class PropertyRegistryClassificationAccessService {
  resolveEffectiveClassification(input: {
    entryClassification: PropertyRegistryAccessClassification;
    restrictions: PropertyRegistryAccessClassification[];
  }): PropertyRegistryAccessClassification {
    const order: PropertyRegistryAccessClassification[] = [
      PropertyRegistryAccessClassification.SEALED,
      PropertyRegistryAccessClassification.GOVERNMENT_RESTRICTED,
      PropertyRegistryAccessClassification.AUTHORIZED_PROFESSIONAL,
      PropertyRegistryAccessClassification.SUBJECT_ACCESS,
      PropertyRegistryAccessClassification.PUBLIC_REGISTRY,
    ];

    const candidates = [input.entryClassification, ...input.restrictions];
    for (const level of order) {
      if (candidates.includes(level)) {
        return level;
      }
    }

    return input.entryClassification;
  }

  assertMayReadRegistryPayload(context: PropertyRegistryAccessContext): void {
    const { accessClassification } = context;

    if (HIGHLY_PROTECTED_ACCESS_CLASSIFICATIONS.includes(accessClassification)) {
      if (context.isAuthorizedGovernmentActor) {
        return;
      }
      throw new ForbiddenException(
        'Restricted or sealed property registry information is not exposed to this actor',
      );
    }

    if (accessClassification === PropertyRegistryAccessClassification.AUTHORIZED_PROFESSIONAL) {
      if (!context.isAuthorizedProfessional && !context.isAuthorizedGovernmentActor) {
        throw new ForbiddenException(
          'Record requires authorized professional or government access',
        );
      }
      return;
    }

    if (accessClassification === PropertyRegistryAccessClassification.SUBJECT_ACCESS) {
      const isSubject =
        context.linkedSubjectIdentityId != null &&
        context.actorIdentityId === context.linkedSubjectIdentityId;

      if (!isSubject && !context.isAuthorizedGovernmentActor) {
        throw new ForbiddenException('Cross-subject property registry access is not permitted');
      }
    }
  }

  assertPublicVerificationOnlyPayload(payload: Record<string, unknown>): Record<string, unknown> {
    return {
      entryReference: payload.entryReference,
      verificationState: payload.verificationState,
      registeredAt: payload.registeredAt,
      titleReference: payload.titleReference,
    };
  }

  maskOrThrow<T extends Record<string, unknown>>(
    context: PropertyRegistryAccessContext,
    payload: T,
  ): T | Record<string, unknown> {
    try {
      this.assertMayReadRegistryPayload(context);
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw new NotFoundException('Property registry record not found');
      }
      throw error;
    }

    if (context.accessClassification === PropertyRegistryAccessClassification.PUBLIC_REGISTRY) {
      return this.assertPublicVerificationOnlyPayload(payload);
    }

    return payload;
  }
}
