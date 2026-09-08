export const APP_CONFIG = 'app';

export interface AppConfig {
  name: string;
  port: number;
  nodeEnv: string;
  apiVersion: string;
  buildVersion: string | null;
}
