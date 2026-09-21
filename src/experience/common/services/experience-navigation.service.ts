import { Injectable } from '@nestjs/common';

import { PERSONA_NAVIGATION } from '../constants/experience-navigation.constants';
import { OFFICIAL_PERSONAS } from '../constants/experience-persona.constants';
import { ExperienceNavigationResponseDto } from '../dto/experience-navigation.dto';
import { type ResolvedExperienceActor } from '../types/experience-actor-context.types';
import { ExperienceLocalizationContract } from './experience-localization.contract';

@Injectable()
export class ExperienceNavigationService {
  constructor(private readonly localization: ExperienceLocalizationContract) {}

  buildNavigation(actor: ResolvedExperienceActor): ExperienceNavigationResponseDto {
    const definitions = PERSONA_NAVIGATION[actor.primaryPersona] ?? [];

    const items = definitions.map((definition) => ({
      key: definition.key,
      label: this.localization.buildLabel(
        {
          defaultLabel: definition.defaultLabel,
          labelKey: definition.labelKey,
        },
        actor.locale,
      ),
      route: definition.route,
      iconKey: definition.iconKey,
      accessible: this.isNavigationAccessible(actor, definition.requiredCapability),
    }));

    return {
      persona: actor.primaryPersona,
      items,
      navigationDisclaimer:
        'Navigation metadata describes presentation capabilities only. Route access and consequential actions require separate authorization at execution time.',
    };
  }

  private isNavigationAccessible(
    actor: ResolvedExperienceActor,
    requiredCapability?: string,
  ): boolean {
    if (!requiredCapability) {
      return true;
    }

    switch (requiredCapability) {
      case 'substantiveAccess':
        return actor.capabilities.substantiveAccess;
      case 'executiveBriefing':
        return actor.capabilities.executiveBriefing;
      case 'departmentManagement':
        return actor.capabilities.departmentManagement;
      case 'technicalAdministration':
        return actor.capabilities.technicalAdministration;
      default:
        return false;
    }
  }

  includesOfficialNavigation(actor: ResolvedExperienceActor): boolean {
    return actor.personas.some((persona) => OFFICIAL_PERSONAS.includes(persona));
  }

  includesExecutiveNavigation(actor: ResolvedExperienceActor): boolean {
    const navigation = this.buildNavigation(actor);
    return navigation.items.some((item) => item.route.startsWith('executive.'));
  }
}
