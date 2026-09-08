import type { DependencyCheckResult, HealthProbe } from '../../src/infrastructure/types';

export class FakeHealthProbe implements HealthProbe {
  constructor(private readonly result: DependencyCheckResult) {}

  async check(): Promise<DependencyCheckResult> {
    return this.result;
  }
}

export function createHealthyProbe(): HealthProbe {
  return new FakeHealthProbe({ status: 'ok' });
}

export function createUnhealthyProbe(message = 'dependency unavailable'): HealthProbe {
  return new FakeHealthProbe({ status: 'error', message });
}

export function createControllableProbe(initial: DependencyCheckResult = { status: 'ok' }): {
  probe: HealthProbe;
  setResult: (result: DependencyCheckResult) => void;
} {
  let current = initial;

  const probe: HealthProbe = {
    async check() {
      return current;
    },
  };

  return {
    probe,
    setResult(result: DependencyCheckResult) {
      current = result;
    },
  };
}
