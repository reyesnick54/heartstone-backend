import { ForbiddenException } from '@nestjs/common';

export class PlatformAdminAccessDeniedException extends ForbiddenException {
  constructor(message = 'Platform administrative access is not permitted') {
    super(message);
  }
}
