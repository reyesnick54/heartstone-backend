/**
 * @deprecated Import ActorContextService from `identity/auth/context/actor-context.service` instead.
 * This re-export preserves legacy SecurityModule wiring during S9 consolidation.
 */
export {
  ActorContextService,
  type ResolveActorContextInput,
} from '../../identity/auth/context/actor-context.service';
export type { InstitutionalCaseAccessActor as ResolvedActorContext } from '../../identity/auth/context/actor-context.types';
