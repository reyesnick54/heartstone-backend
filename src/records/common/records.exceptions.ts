import { ForbiddenException } from '@nestjs/common';

export class MasterFileAccessDeniedException extends ForbiddenException {
  constructor(message = 'Access to this Master Administrative File is denied') {
    super(message);
  }
}

export class MasterFileAlreadyExistsException extends ForbiddenException {
  constructor(caseId: string) {
    super(`Case "${caseId}" already has a Master Administrative File`);
  }
}

export class MasterFileImmutableFieldException extends ForbiddenException {
  constructor(field: string) {
    super(`Master Administrative File field "${field}" is immutable`);
  }
}
