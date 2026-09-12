import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

export class EvidenceRecordNotFoundException extends NotFoundException {
  constructor(id: string) {
    super(`EvidenceRecord "${id}" was not found`);
  }
}

export class EvidenceVerificationForbiddenException extends ForbiddenException {
  constructor(detail: string) {
    super(`Evidence verification is not permitted: ${detail}`);
  }
}

export class EvidenceClientAssertionForbiddenException extends ForbiddenException {
  constructor(field: string) {
    super(`Clients cannot set evidence field "${field}"`);
  }
}

export class UnknownVerificationMethodException extends BadRequestException {
  constructor(method: string) {
    super(`Unknown verification method "${method}" is not permitted`);
  }
}

export class EvidencePurposeAcceptanceForbiddenException extends ForbiddenException {
  constructor(detail: string) {
    super(`Evidence purpose acceptance is not permitted: ${detail}`);
  }
}
