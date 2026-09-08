export { createApp } from './app';
export type { AppInstance, CreateAppOptions } from './app';
export { getVersionInfo } from './config/version';
export { loadRuntimeConfig } from './config/env';
export { ReadinessService } from './services/readiness';
export type {
  AppDependencies,
  DependencyCheckResult,
  DependencyStatus,
  HealthProbe,
  ReadinessReport,
} from './infrastructure/types';
