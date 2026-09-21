import { ForbiddenException } from '@nestjs/common';

export class DepartmentAccessDeniedException extends ForbiddenException {
  constructor(reason: string) {
    super(`Department management access denied: ${reason}`);
  }
}
