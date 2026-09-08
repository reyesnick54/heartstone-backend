import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { registerAs } from '@nestjs/config';

import { APP_CONFIG, type AppConfig } from './config.constants';

function resolveBuildVersion(): string | null {
  const fromEnv = process.env.BUILD_VERSION?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  try {
    const packageJsonPath = join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
      version?: string;
    };
    return packageJson.version ?? null;
  } catch {
    return null;
  }
}

export default registerAs(APP_CONFIG, (): AppConfig => ({
  name: process.env.APP_NAME ?? 'heartstone-backend',
  port: Number(process.env.PORT ?? 3000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  apiVersion: process.env.API_VERSION ?? 'v1',
  buildVersion: resolveBuildVersion(),
}));
