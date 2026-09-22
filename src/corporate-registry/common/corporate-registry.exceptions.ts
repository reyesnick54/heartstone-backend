import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

export class CorporateRegistryProfileNotFoundException extends NotFoundException {
  constructor(organizationId: string) {
    super(`Corporate registry profile not found for organization ${organizationId}`);
  }
}

export class CorporateRegistryVerificationNotFoundException extends NotFoundException {
  constructor(reference: string) {
    super(`Corporate registry verification reference ${reference} was not found or is not public`);
  }
}

export class CorporateRegistryVerificationDisabledException extends NotFoundException {
  constructor() {
    super('Public corporate registry verification is not enabled');
  }
}

export class CorporateRegistryClientStatusForgeryException extends ForbiddenException {
  constructor() {
    super('Corporate registration status may only change through official registry decisions');
  }
}

export class CorporateCertificateIssuanceBlockedException extends BadRequestException {
  constructor(reason: string) {
    super(`Corporate certificate cannot be issued: ${reason}`);
  }
}

export class CorporateRegistryDecisionRequiredException extends BadRequestException {
  constructor() {
    super('Incorporation or registration requires an approved official registry decision');
  }
}
