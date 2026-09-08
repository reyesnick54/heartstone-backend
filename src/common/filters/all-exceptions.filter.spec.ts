import { type ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';

import { AllExceptionsFilter } from './all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  const createHost = () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const request = { url: '/api/v1/test', method: 'GET' };

    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => request,
      }),
    } as unknown as ArgumentsHost;

    return { host, json, status };
  };

  it('returns generic 500 messages in production', () => {
    const filter = new AllExceptionsFilter('production');
    const { host, json, status } = createHost();

    filter.catch(new Error('database connection failed'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      }),
    );
  });

  it('preserves client-facing 4xx messages', () => {
    const filter = new AllExceptionsFilter('production');
    const { host, json, status } = createHost();

    filter.catch(new HttpException('Invalid input', HttpStatus.BAD_REQUEST), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Invalid input',
      }),
    );
  });

  it('maps payload-too-large parser errors to HTTP 413', () => {
    const filter = new AllExceptionsFilter('development');
    const { host, json, status } = createHost();
    const error = new Error('request entity too large') as Error & {
      type: string;
      status: number;
    };
    error.type = 'entity.too.large';
    error.status = 413;

    filter.catch(error, host);

    expect(status).toHaveBeenCalledWith(HttpStatus.PAYLOAD_TOO_LARGE);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
        message: 'Request body too large',
      }),
    );
  });
});
