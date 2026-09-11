import {
  type Appointment,
  type Delegation,
  type Identity,
  type IdentityOfficeholderLink,
} from '@prisma/client';

export interface ResolvedInstitutionalActor {
  identityId: string;
  identityType: Identity['type'];
  officeholderId: string;
  officeholderLink: IdentityOfficeholderLink;
  appointment: Appointment | null;
  delegation: Delegation | null;
}

export interface InstitutionalActorResolutionFailure {
  code: string;
  message: string;
}
