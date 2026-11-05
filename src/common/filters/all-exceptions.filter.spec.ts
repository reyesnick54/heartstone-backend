import {
  type ArgumentsHost,
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';

import { API_ERROR_CODES, codedErrorBody } from '../errors/api-error-codes';
import { AllExceptionsFilter } from './all-exceptions.filter';

function firstJsonBody(json: jest.Mock): Record<string, unknown> {
  const [first] = json.mock.calls as [Record<string, unknown>][];
  if (!first) {
    throw new Error('expected a JSON response');
  }
  return first[0];
}

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

  describe('machine-readable codes', () => {
    it('passes a coded Nest-shaped body through unchanged', () => {
      const filter = new AllExceptionsFilter('production');
      const { host, json, status } = createHost();
      const body = codedErrorBody(
        HttpStatus.UNAUTHORIZED,
        'Recent stronger authentication is required',
        API_ERROR_CODES.STEP_UP_REQUIRED,
      );

      filter.catch(new UnauthorizedException(body), host);

      expect(status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.UNAUTHORIZED,
          message: 'Recent stronger authentication is required',
          code: 'STEP_UP_REQUIRED',
        }),
      );
    });

    it('preserves code from a custom payload without statusCode', () => {
      const filter = new AllExceptionsFilter('production');
      const { host, json } = createHost();

      filter.catch(
        new ForbiddenException({ message: 'Consequential action blocked', code: 'SAFE_HALT' }),
        host,
      );

      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Consequential action blocked', code: 'SAFE_HALT' }),
      );
    });

    it('omits code when the exception has none', () => {
      const filter = new AllExceptionsFilter('production');
      const { host, json } = createHost();

      filter.catch(new BadRequestException('Invalid input'), host);

      const body = firstJsonBody(json);
      expect(body).not.toHaveProperty('code');
    });

    it('drops malformed codes rather than echoing them', () => {
      const filter = new AllExceptionsFilter('production');
      const { host, json } = createHost();

      filter.catch(
        new HttpException(
          {
            statusCode: 400,
            message: 'Bad',
            error: 'Bad Request',
            code: 'select * from users; --',
          },
          HttpStatus.BAD_REQUEST,
        ),
        host,
      );

      const body = firstJsonBody(json);
      expect(body).not.toHaveProperty('code');
      expect(body.message).toBe('Bad');
    });

    it('never reads code from non-HTTP errors such as database driver errors', () => {
      const filter = new AllExceptionsFilter('production');
      const { host, json } = createHost();
      const driverError = Object.assign(new Error('unique violation on users_email_key'), {
        code: 'P2002',
      });

      filter.catch(driverError, host);

      const body = firstJsonBody(json);
      expect(body).not.toHaveProperty('code');
      expect(body.message).toBe('Internal server error');
      expect(JSON.stringify(body)).not.toContain('users_email_key');
    });

    it('in production keeps only registered codes on 5xx responses', () => {
      const filter = new AllExceptionsFilter('production');
      const { host, json } = createHost();

      filter.catch(
        new ServiceUnavailableException({
          statusCode: 503,
          message: 'Upstream failed at db-primary-3',
          error: 'Service Unavailable',
          code: 'INTERNAL_POOL_EXHAUSTED',
        }),
        host,
      );

      const body = firstJsonBody(json);
      expect(body).not.toHaveProperty('code');
      expect(body.message).toBe('Internal server error');
    });

    it('in production keeps SAFE_HALT on a 5xx response', () => {
      const filter = new AllExceptionsFilter('production');
      const { host, json } = createHost();

      filter.catch(
        new ServiceUnavailableException(
          codedErrorBody(
            HttpStatus.SERVICE_UNAVAILABLE,
            'Service halted',
            API_ERROR_CODES.SAFE_HALT,
          ),
        ),
        host,
      );

      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'SAFE_HALT', message: 'Internal server error' }),
      );
    });
  });
});
