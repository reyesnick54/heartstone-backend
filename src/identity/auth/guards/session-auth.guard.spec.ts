import { type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AssuranceLevel } from '@prisma/client';

import { type ActorContextService } from '../context/actor-context.service';
import { SessionAuthGuard } from './session-auth.guard';

describe('SessionAuthGuard', () => {
  const sessionsService = {
    validateSessionToken: jest.fn(),
  };
  const actorContextService = {
    resolveFromSessionContext: jest.fn(),
    assertNoClientIdentitySubstitution: jest.fn(),
  };

  const guard = new SessionAuthGuard(
    sessionsService as never,
    actorContextService as unknown as ActorContextService,
  );

  function createContext(headers: Record<string, string>, body?: Record<string, unknown>) {
    const request = { headers, body } as {
      headers: Record<string, string>;
      body?: Record<string, unknown>;
      session?: unknown;
      actor?: unknown;
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      request,
    } as unknown as ExecutionContext & { request: typeof request };
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects missing authorization header', async () => {
    const context = createContext({});

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('sets session and actor on the request after successful validation', async () => {
    const session = {
      sessionId: 'session-1',
      identityId: 'identity-1',
      assuranceLevel: AssuranceLevel.LOW,
    };
    const actor = { identityId: 'identity-1', sessionId: 'session-1' };

    sessionsService.validateSessionToken.mockResolvedValue(session);
    actorContextService.resolveFromSessionContext.mockResolvedValue(actor);

    const context = createContext({ authorization: 'Bearer token-123' });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(context.request.session).toEqual(session);
    expect(context.request.actor).toEqual(actor);
    expect(actorContextService.assertNoClientIdentitySubstitution).toHaveBeenCalledWith(
      actor,
      undefined,
    );
  });

  it('checks client identity substitution against request body', async () => {
    const session = {
      sessionId: 'session-1',
      identityId: 'identity-1',
      assuranceLevel: AssuranceLevel.LOW,
    };
    const actor = { identityId: 'identity-1', sessionId: 'session-1' };
    const body = { identityId: 'identity-2', payload: 'x' };

    sessionsService.validateSessionToken.mockResolvedValue(session);
    actorContextService.resolveFromSessionContext.mockResolvedValue(actor);

    const context = createContext({ authorization: 'Bearer token-123' }, body);

    await guard.canActivate(context);
    expect(actorContextService.assertNoClientIdentitySubstitution).toHaveBeenCalledWith(
      actor,
      body,
    );
  });
});
