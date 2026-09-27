import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC_ROOT = join(__dirname, '..');
const FORBIDDEN_IMPORT = /from ['"][^'"]*platform-setup/;

function collectTypeScriptFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      if (entry === 'platform-setup') {
        continue;
      }
      collectTypeScriptFiles(fullPath, acc);
      continue;
    }
    if (entry.endsWith('.ts')) {
      acc.push(fullPath);
    }
  }
  return acc;
}

describe('platform core import boundary', () => {
  it('does not import platform-setup from generic core modules', () => {
    const violations: string[] = [];
    for (const file of collectTypeScriptFiles(SRC_ROOT)) {
      const content = readFileSync(file, 'utf8');
      if (FORBIDDEN_IMPORT.test(content)) {
        violations.push(file);
      }
    }
    expect(violations).toEqual([]);
  });
});
