import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

export class CommunicationMessageNotFoundException extends NotFoundException {
  constructor(reference: string) {
    super(`CommunicationMessage "${reference}" was not found`);
  }
}

export class CommunicationDeliveryNotFoundException extends NotFoundException {
  constructor(deliveryId: string) {
    super(`CommunicationDelivery "${deliveryId}" was not found`);
  }
}

export class CommunicationTemplateNotFoundException extends NotFoundException {
  constructor(reference: string) {
    super(`CommunicationTemplate "${reference}" was not found`);
  }
}

export class CommunicationTemplateVersionImmutableException extends BadRequestException {
  constructor(versionId: string) {
    super(`CommunicationTemplateVersion "${versionId}" is active and immutable`);
  }
}

export class TemplateInjectionException extends BadRequestException {
  constructor(fieldName: string) {
    super(`Template field "${fieldName}" contains forbidden injection content`);
  }
}

export class CommunicationChannelForbiddenException extends ForbiddenException {
  constructor(channel: string, classification: string) {
    super(`Channel "${channel}" is not approved for classification "${classification}"`);
  }
}

export class MandatoryCommunicationSuppressedException extends ForbiddenException {
  constructor(category: string) {
    super(`Mandatory communication category "${category}" cannot be suppressed by preference`);
  }
}

export class CommunicationRecipientBlockedException extends ForbiddenException {
  constructor(reason: string) {
    super(`Recipient blocked: ${reason}`);
  }
}

export class RepresentativeAuthorityInvalidException extends ForbiddenException {
  constructor(reason: string) {
    super(`Representative authority invalid: ${reason}`);
  }
}

export class CommunicationApprovalRequiredException extends BadRequestException {
  constructor() {
    super('Official communication requires human approval before delivery');
  }
}

export class CertifiedTranslationRequiredException extends BadRequestException {
  constructor() {
    super('Certified translation is required; AI output cannot substitute');
  }
}

export class DuplicateReceiptException extends BadRequestException {
  constructor(idempotencyKey: string) {
    super(`Receipt already recorded for callback idempotency key "${idempotencyKey}"`);
  }
}

export class SubstantiveNoticeDuplicationException extends BadRequestException {
  constructor(sourceRecordType: string) {
    super(
      `Cannot duplicate substantive notice content for "${sourceRecordType}"; reference canonical notice instead`,
    );
  }
}
