import { ConflictException } from '@nestjs/common';

export class VersionSupersededException extends ConflictException {
  constructor(message = 'The requested service configuration is no longer valid for new starts.') {
    super({
      statusCode: 409,
      error: 'VERSION_SUPERSEDED',
      message,
    });
  }
}
