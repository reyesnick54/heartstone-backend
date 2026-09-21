import { Injectable } from '@nestjs/common';

import { LocalizedLabelDto } from '../dto/localized-label.dto';

export interface LocalizedLabelInput {
  defaultLabel: string;
  labelKey: string;
  labels?: Record<string, string>;
}

@Injectable()
export class ExperienceLocalizationContract {
  readonly defaultLocale = 'en';

  buildLabel(input: LocalizedLabelInput, locale?: string): LocalizedLabelDto {
    const resolvedLocale = locale ?? this.defaultLocale;
    const localizedLabel =
      input.labels?.[resolvedLocale] ?? input.labels?.[this.defaultLocale] ?? input.defaultLabel;

    return {
      label: localizedLabel,
      labelKey: input.labelKey,
      labels: input.labels,
    };
  }

  /**
   * Presentation labels must remain separate from authoritative record content.
   * Authoritative fields (e.g. official record titles) are returned in dedicated fields.
   */
  separatePresentationFromAuthoritative<T extends Record<string, unknown>>(
    authoritativeContent: T,
    presentationLabel: LocalizedLabelDto,
  ): { authoritativeContent: T; presentationLabel: LocalizedLabelDto } {
    return {
      authoritativeContent,
      presentationLabel,
    };
  }
}
