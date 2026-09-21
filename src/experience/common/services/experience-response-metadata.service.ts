import { Injectable } from '@nestjs/common';

import { OFFICIAL_AUTHORITY_DISCLAIMER } from '../../official/official-experience.constants';
import {
  ExperienceLocalizationMetadataDto,
  ExperienceResponseMetadataDto,
} from '../dto/experience-response-metadata.dto';
import { type ResolvedExperienceActor } from '../types/experience-actor-context.types';
import { ExperienceLocalizationContract } from './experience-localization.contract';

@Injectable()
export class ExperienceResponseMetadataService {
  constructor(private readonly localization: ExperienceLocalizationContract) {}

  buildLocalizationMetadata(locale?: string): ExperienceLocalizationMetadataDto {
    const resolvedLocale = locale ?? this.localization.defaultLocale;
    return {
      locale: resolvedLocale,
      defaultLocale: this.localization.defaultLocale,
      localizationNote:
        'Localized labels are presentation metadata only. Authoritative record content is returned in separate fields and is not translated by the experience layer.',
    };
  }

  buildMetadata(
    actor: ResolvedExperienceActor,
    options?: { scopeDisclaimer?: string },
  ): ExperienceResponseMetadataDto {
    return {
      generatedAt: new Date().toISOString(),
      localization: this.buildLocalizationMetadata(actor.locale),
      persona: actor.primaryPersona,
      authorityDisclaimer: OFFICIAL_AUTHORITY_DISCLAIMER,
      scopeDisclaimer: options?.scopeDisclaimer,
    };
  }
}
