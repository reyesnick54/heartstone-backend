import { ForbiddenException, NotFoundException } from '@nestjs/common';

import {
  type ScopeAccessIntent,
  ScopeDenialReason,
  ScopedResourceType,
} from './institutional-scope.types';

export class InstitutionalScopeDeniedException extends ForbiddenException {
  constructor(
    public readonly reason: ScopeDenialReason,
    message = 'Access to this resource is not permitted under institutional scope policy',
  ) {
    super({ message, reason, domain: 'institutional-scope' });
  }
}

export class ScopedResourceNotFoundException extends NotFoundException {
  constructor(
    public readonly resourceType: ScopedResourceType,
    resourceId: string,
  ) {
    super(`${resourceType} "${resourceId}" was not found`);
  }
}

export function maskDeniedAsNotFound(
  resourceType: ScopedResourceType,
  resourceId: string,
  reason: ScopeDenialReason,
): Error {
  const subjectBoundTypes = new Set<ScopedResourceType>([
    ScopedResourceType.IDENTITY,
    ScopedResourceType.IMMIGRATION_PROFILE,
    ScopedResourceType.DRIVER_PROFILE,
    ScopedResourceType.WORKER_PROFILE_REFERENCE,
    ScopedResourceType.STUDENT_EDUCATION_PROFILE,
    ScopedResourceType.VEHICLE_RECORD,
    ScopedResourceType.APPLICATION,
  ]);

  if (
    reason === ScopeDenialReason.CROSS_APPLICANT ||
    reason === ScopeDenialReason.RAW_UUID_INSUFFICIENT ||
    (subjectBoundTypes.has(resourceType) && reason !== ScopeDenialReason.RESOURCE_NOT_FOUND)
  ) {
    return new ScopedResourceNotFoundException(resourceType, resourceId);
  }

  return new InstitutionalScopeDeniedException(reason);
}

export function buildDenialMessage(intent: ScopeAccessIntent, reason: ScopeDenialReason): string {
  return `Institutional scope ${intent} denied: ${reason}`;
}
