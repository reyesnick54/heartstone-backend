export type DependencyStatus = 'ok' | 'error';

export interface DependencyCheckResult {
  status: DependencyStatus;
  message?: string;
}

export interface HealthProbe {
  check(): Promise<DependencyCheckResult>;
}

export interface AppDependencies {
  database: HealthProbe;
  redis: HealthProbe;
}

export interface ReadinessReport {
  status: 'ready' | 'not_ready';
  checks: {
    database: DependencyStatus;
    redis: DependencyStatus;
  };
  messages?: {
    database?: string;
    redis?: string;
  };
}
