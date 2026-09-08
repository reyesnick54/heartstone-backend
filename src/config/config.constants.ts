export const APP_CONFIG = 'app';
export const SECURITY_CONFIG = 'security';

export interface AppConfig {
  name: string;
  port: number;
  nodeEnv: string;
  apiVersion: string;
  buildVersion: string | null;
}

export interface SecurityConfig {
  cors: {
    enabled: boolean;
    origins: string[] | boolean;
    credentials: boolean;
  };
  bodyLimit: string;
  swaggerEnabled: boolean;
  trustProxy: boolean;
}
