import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface VersionInfo {
  name: string;
  version: string;
}

const packageJsonPath = join(process.cwd(), 'package.json');

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
