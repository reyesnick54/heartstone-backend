import { registerAs } from '@nestjs/config';

import { IDENTITY_CONFIG, type IdentityConfig } from './config.constants';

export default registerAs(IDENTITY_CONFIG, (): IdentityConfig => ({
  sessionTtlSeconds: parseInt(process.env.SESSION_TTL_SECONDS ?? '3600', 10),
  sessionTokenBytes: parseInt(process.env.SESSION_TOKEN_BYTES ?? '32', 10),
}));
