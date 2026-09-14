#!/usr/bin/env node

const { execSync } = require('node:child_process');

const SEVERITY_THRESHOLD = process.env.NPM_AUDIT_SEVERITY_THRESHOLD ?? 'critical';
const ALLOWED_CRITICAL = Number(process.env.NPM_AUDIT_ALLOWED_CRITICAL ?? '0');

function main() {
  let audit;
  try {
    audit = JSON.parse(execSync('npm audit --json', { encoding: 'utf8' }));
  } catch (error) {
    const stdout = error.stdout?.toString?.() ?? '{}';
    audit = JSON.parse(stdout);
  }

  const vulnerabilities = audit.metadata?.vulnerabilities ?? {};
  const critical = vulnerabilities.critical ?? 0;
  const high = vulnerabilities.high ?? 0;
  const moderate = vulnerabilities.moderate ?? 0;

  console.log(
    `Dependency vulnerability summary: critical=${critical}, high=${high}, moderate=${moderate}`,
  );

  if (critical > ALLOWED_CRITICAL) {
    console.error(
      `Policy violation: ${critical} critical vulnerabilities exceed allowed threshold (${ALLOWED_CRITICAL}).`,
    );
    console.error(
      'Known critical vulnerabilities prevent production readiness unless formally dispositioned.',
    );
    process.exit(1);
  }

  if (SEVERITY_THRESHOLD === 'high' && high > 0) {
    console.error(`Policy violation: ${high} high vulnerabilities detected.`);
    process.exit(1);
  }

  if (SEVERITY_THRESHOLD === 'moderate' && moderate > 0) {
    console.error(`Policy violation: ${moderate} moderate vulnerabilities detected.`);
    process.exit(1);
  }

  console.log('Dependency vulnerability policy check passed.');
}

main();
