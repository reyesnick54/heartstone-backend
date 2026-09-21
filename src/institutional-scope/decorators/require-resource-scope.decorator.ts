import { SetMetadata } from '@nestjs/common';

import { ScopeAccessIntent, type ScopedResourceType } from '../institutional-scope.types';

export const RESOURCE_SCOPE_METADATA_KEY = 'heartstone:resource-scope';

export interface ResourceScopeMetadata {
  resourceType: ScopedResourceType;
  intent: ScopeAccessIntent;
  paramName?: string;
  maskEnumeration?: boolean;
}

export const RequireResourceScope = (
  resourceType: ScopedResourceType,
  intent: ScopeAccessIntent = ScopeAccessIntent.VISIBILITY,
  options?: Pick<ResourceScopeMetadata, 'paramName' | 'maskEnumeration'>,
): MethodDecorator =>
  SetMetadata(RESOURCE_SCOPE_METADATA_KEY, {
    resourceType,
    intent,
    paramName: options?.paramName ?? 'id',
    maskEnumeration: options?.maskEnumeration ?? false,
  } satisfies ResourceScopeMetadata);
