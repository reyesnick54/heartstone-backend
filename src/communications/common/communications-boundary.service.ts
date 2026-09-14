import { Injectable } from '@nestjs/common';
import {
  CommunicationClassification,
  CommunicationMandatoryCategory,
  CommunicationPreferenceScope,
  type RepresentativeAuthority,
  RepresentativeAuthorityStatus,
} from '@prisma/client';

import {
  FORBIDDEN_SUBSTANTIVE_NOTICE_TYPES,
  MANDATORY_COMMUNICATION_CATEGORIES,
  OPTIONAL_COMMUNICATION_PREFERENCE_SCOPES,
  RESTRICTED_COMMUNICATION_CLASSIFICATIONS,
  UNAPPROVED_CHANNELS_FOR_RESTRICTED,
} from '../communications.constants';
import {
  CommunicationChannelForbiddenException,
  MandatoryCommunicationSuppressedException,
  RepresentativeAuthorityInvalidException,
  SubstantiveNoticeDuplicationException,
} from './communications.exceptions';

@Injectable()
export class CommunicationsBoundaryService {
  assertNotDuplicatingSubstantiveNotice(sourceRecordType: string, bodyContent?: string): void {
    if (
      (FORBIDDEN_SUBSTANTIVE_NOTICE_TYPES as readonly string[]).includes(sourceRecordType) &&
      bodyContent
    ) {
      throw new SubstantiveNoticeDuplicationException(sourceRecordType);
    }
  }

  assertMandatoryNotSuppressed(
    mandatoryCategory: CommunicationMandatoryCategory | null | undefined,
    preferenceEnabled: boolean,
  ): void {
    if (!mandatoryCategory) {
      return;
    }

    if (
      (MANDATORY_COMMUNICATION_CATEGORIES as readonly string[]).includes(mandatoryCategory) &&
      !preferenceEnabled
    ) {
      throw new MandatoryCommunicationSuppressedException(mandatoryCategory);
    }
  }

  assertOptionalPreferenceRespected(
    scope: CommunicationPreferenceScope,
    enabled: boolean,
    mandatoryCategory?: CommunicationMandatoryCategory | null,
  ): boolean {
    if (
      mandatoryCategory &&
      (MANDATORY_COMMUNICATION_CATEGORIES as readonly string[]).includes(mandatoryCategory)
    ) {
      return true;
    }

    if ((OPTIONAL_COMMUNICATION_PREFERENCE_SCOPES as readonly string[]).includes(scope)) {
      return enabled;
    }

    return true;
  }

  assertChannelApprovedForClassification(
    channel: string,
    classification: CommunicationClassification,
  ): void {
    if (
      (RESTRICTED_COMMUNICATION_CLASSIFICATIONS as readonly string[]).includes(classification) &&
      (UNAPPROVED_CHANNELS_FOR_RESTRICTED as readonly string[]).includes(channel)
    ) {
      throw new CommunicationChannelForbiddenException(channel, classification);
    }
  }

  assertRepresentativeAuthorityValid(
    authority: RepresentativeAuthority | null | undefined,
    at: Date = new Date(),
  ): void {
    if (!authority) {
      throw new RepresentativeAuthorityInvalidException('representative authority is required');
    }

    if (authority.status !== RepresentativeAuthorityStatus.ACTIVE) {
      throw new RepresentativeAuthorityInvalidException(`status is ${authority.status}`);
    }

    if (authority.effectiveFrom > at) {
      throw new RepresentativeAuthorityInvalidException('authority not yet effective');
    }

    if (authority.effectiveUntil && authority.effectiveUntil <= at) {
      throw new RepresentativeAuthorityInvalidException('authority has expired');
    }
  }

  isMandatoryCategory(category: CommunicationMandatoryCategory | null | undefined): boolean {
    return (
      category !== null &&
      category !== undefined &&
      (MANDATORY_COMMUNICATION_CATEGORIES as readonly string[]).includes(category)
    );
  }

  emailOpenDoesNotEqualLegalReceipt(emailOpenPixel: boolean): boolean {
    return emailOpenPixel;
  }
}
