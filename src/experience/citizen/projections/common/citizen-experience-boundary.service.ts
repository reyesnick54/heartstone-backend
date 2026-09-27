import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  CommunicationChannelType,
  CommunicationMessageStatus,
  DocumentSecurityClassification,
  MalwareScanStatus,
} from '@prisma/client';

import {
  CITIZEN_ACKNOWLEDGABLE_CHANNELS,
  CITIZEN_BLOCKED_MALWARE_STATUSES,
  CITIZEN_EXPERIENCE_BOUNDARY_DISCLAIMER,
  CITIZEN_EXPERIENCE_REASON_CODES,
  CITIZEN_MESSAGE_ACKNOWLEDGMENT_DISCLAIMER,
  CITIZEN_PAYMENT_PROJECTION_DISCLAIMER,
  CITIZEN_RESTRICTED_DOCUMENT_CLASSIFICATIONS,
  CITIZEN_VISIBLE_MESSAGE_STATUSES,
} from '../citizen-experience.constants';

@Injectable()
export class CitizenExperienceBoundaryService {
  boundaryDisclaimer(): { disclaimer: string } {
    return { disclaimer: CITIZEN_EXPERIENCE_BOUNDARY_DISCLAIMER };
  }

  paymentProjectionDisclaimer(): { disclaimer: string } {
    return { disclaimer: CITIZEN_PAYMENT_PROJECTION_DISCLAIMER };
  }

  messageAcknowledgmentDisclaimer(): { disclaimer: string } {
    return { disclaimer: CITIZEN_MESSAGE_ACKNOWLEDGMENT_DISCLAIMER };
  }

  assertCrossCitizenAccessAllowed(allowed: boolean): void {
    if (!allowed) {
      throw new ForbiddenException({
        message: 'Resource is not accessible to this citizen identity',
        code: CITIZEN_EXPERIENCE_REASON_CODES.CROSS_CITIZEN_ACCESS_DENIED,
      });
    }
  }

  assertRepresentationScopeAllowed(allowed: boolean): void {
    if (!allowed) {
      throw new ForbiddenException({
        message: 'Resource is outside representative authority scope',
        code: CITIZEN_EXPERIENCE_REASON_CODES.REPRESENTATION_SCOPE_DENIED,
      });
    }
  }

  isDocumentClassificationCitizenVisible(classification: DocumentSecurityClassification): boolean {
    return !CITIZEN_RESTRICTED_DOCUMENT_CLASSIFICATIONS.includes(
      classification as (typeof CITIZEN_RESTRICTED_DOCUMENT_CLASSIFICATIONS)[number],
    );
  }

  isMalwareStatusCitizenVisible(status: MalwareScanStatus): boolean {
    return !CITIZEN_BLOCKED_MALWARE_STATUSES.includes(
      status as (typeof CITIZEN_BLOCKED_MALWARE_STATUSES)[number],
    );
  }

  isMessageCitizenVisible(status: CommunicationMessageStatus): boolean {
    return CITIZEN_VISIBLE_MESSAGE_STATUSES.includes(
      status as (typeof CITIZEN_VISIBLE_MESSAGE_STATUSES)[number],
    );
  }

  isMessageAcknowledgable(input: {
    status: CommunicationMessageStatus;
    channelType: CommunicationChannelType;
    recipientMatches: boolean;
    alreadyAcknowledged: boolean;
  }): boolean {
    if (!input.recipientMatches) {
      return false;
    }

    if (!this.isMessageCitizenVisible(input.status)) {
      return false;
    }

    if (
      !CITIZEN_ACKNOWLEDGABLE_CHANNELS.includes(
        input.channelType as (typeof CITIZEN_ACKNOWLEDGABLE_CHANNELS)[number],
      )
    ) {
      return false;
    }

    return !input.alreadyAcknowledged;
  }

  assertMessageAcknowledgable(allowed: boolean): void {
    if (!allowed) {
      throw new ForbiddenException({
        message: 'Message cannot be acknowledged under current communication rules',
        code: CITIZEN_EXPERIENCE_REASON_CODES.MESSAGE_NOT_ACKNOWLEDGABLE,
      });
    }
  }
}
