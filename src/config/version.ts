import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export interface VersionInfo {
  name: string;
  version: string;
}

const packageJsonPath = join(dirname(fileURLToPath(import.meta.url)), '../../package.json');

export function getVersionInfo(): VersionInfo {
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as {
    name: string;
    version: string;
  };

  return {
    name: packageJson.name,
    version: packageJson.version,
  };
}
