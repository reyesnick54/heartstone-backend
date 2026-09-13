import { ConflictException, ForbiddenException, UnprocessableEntityException } from '@nestjs/common';

export class IssuanceNotReadyException extends UnprocessableEntityException {
  constructor(
    message: string,
    public readonly checklistResults: Record<string, { passed: boolean; detail?: string }>,
  ) {
    super({ message, checklistResults });
  }
}

export class IssuanceBlockedException extends ForbiddenException {
  constructor(message: string, public readonly code: string) {
    super({ message, code });
  }
}

export class InstrumentNumberConflictException extends ConflictException {}

export class RetainedNationalIssuanceException extends ForbiddenException {
  constructor(message: string) {
    super({ message, code: 'RETAINED_NATIONAL_BOUNDARY' });
  }
}

export class TemplateInjectionException extends ForbiddenException {
  constructor(field: string) {
    super(`Template field "${field}" contains disallowed content`);
  }
}
