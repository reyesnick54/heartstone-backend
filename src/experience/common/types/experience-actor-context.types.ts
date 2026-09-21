import { type ActorContext } from '../../../identity/auth/context/actor-context.types';
import { type ResolvedOfficialContext } from '../../official/types/official-context.types';
import { type ExperiencePersona } from '../constants/experience-persona.constants';

export interface ExperienceCapabilities {
  canSearchCitizenResources: boolean;
  canSearchOfficialResources: boolean;
  substantiveAccess: boolean;
  executiveBriefing: boolean;
  departmentManagement: boolean;
  technicalAdministration: boolean;
  hasRepresentativeAuthority: boolean;
  hasOrganizationMembership: boolean;
}

export interface ResolvedExperienceActor {
  identityId: string;
  primaryPersona: ExperiencePersona;
  personas: ExperiencePersona[];
  actor: ActorContext;
  officialContext: ResolvedOfficialContext | null;
  capabilities: ExperienceCapabilities;
  locale: string;
  technicalRoleMarker?: string;
}
