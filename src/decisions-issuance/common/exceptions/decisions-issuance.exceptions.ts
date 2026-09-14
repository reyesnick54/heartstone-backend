import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

export class InstrumentNotFoundException extends NotFoundException {
  constructor(reference: string) {
    super(`Official instrument "${reference}" was not found`);
  }
}

export class InstrumentVersionNotFoundException extends NotFoundException {
  constructor(reference: string) {
    super(`Official instrument version "${reference}" was not found`);
  }
}

export class InstrumentDeliveryNotFoundException extends NotFoundException {
  constructor(reference: string) {
    super(`Instrument delivery "${reference}" was not found`);
  }
}

export class InstrumentDeliveryChannelForbiddenException extends ForbiddenException {
  constructor(channel: string, classification: string) {
    super(`Delivery channel "${channel}" is not approved for classification "${classification}"`);
  }
}

export class InstrumentDownloadForbiddenException extends ForbiddenException {
  constructor(reason: string) {
    super(`Instrument download is not authorized: ${reason}`);
  }
}

export class InstrumentVerificationRateLimitedException extends BadRequestException {
  constructor() {
    super('Verification request rate limit exceeded');
  }
}

export class InstrumentVerificationNotFoundException extends NotFoundException {
  constructor() {
    super('Verification reference could not be verified');
  }
}
