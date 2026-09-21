import { ForbiddenException } from '@nestjs/common';

export class BusinessAccessDeniedException extends ForbiddenException {
  constructor(message = 'Access to this business organization is not permitted') {
    super(message);
  }
}
