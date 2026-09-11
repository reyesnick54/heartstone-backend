import { type Credential } from '@prisma/client';

import { type CredentialResponseDto } from './dto/credential-response.dto';

export function toCredentialResponse(credential: Credential): CredentialResponseDto {
  return {
    id: credential.id,
    identityId: credential.identityId,
    type: credential.type,
    status: credential.status,
    oidcProvider: credential.oidcProvider,
    oidcSubject: credential.oidcSubject,
    revokedAt: credential.revokedAt,
    createdAt: credential.createdAt,
    updatedAt: credential.updatedAt,
  };
}
