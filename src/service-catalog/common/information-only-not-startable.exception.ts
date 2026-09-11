import { UnprocessableEntityException } from '@nestjs/common';

export class InformationOnlyNotStartableException extends UnprocessableEntityException {
  constructor(
    message = 'This service is information-only and cannot begin an application-capable start package.',
  ) {
    super({
      statusCode: 422,
      error: 'INFORMATION_ONLY_NOT_STARTABLE',
      message,
    });
  }
}
