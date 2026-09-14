#!/usr/bin/env node

const { execSync } = require('node:child_process');
const { existsSync } = require('node:fs');

function main() {
  try {
    execSync('gitleaks version', { stdio: 'ignore' });
  } catch {
    console.log('Installing gitleaks for secret scanning...');
    execSync(
      'curl -sSL https://github.com/gitleaks/gitleaks/releases/download/v8.24.2/gitleaks_8.24.2_linux_x64.tar.gz | tar -xz -C /tmp && chmod +x /tmp/gitleaks',
      { stdio: 'inherit', shell: true },
    );
  }

  const gitleaksBinary = existsSync('/tmp/gitleaks') ? '/tmp/gitleaks' : 'gitleaks';

  execSync(`${gitleaksBinary} detect --source . --no-git --config .gitleaks.toml --redact --exit-code 1`, {
    stdio: 'inherit',
    env: {
      ...process.env,
    },
  });

  console.log('Secret scanning check passed.');
}

main();
