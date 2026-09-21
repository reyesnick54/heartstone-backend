import { ForbiddenException } from '@nestjs/common';

export class CitizenAccessDeniedException extends ForbiddenException {
  constructor(message = 'Access to this citizen resource is not permitted') {
    super(message);
  }
}
