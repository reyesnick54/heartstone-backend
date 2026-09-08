import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import appConfig from '../config/app.config';
import { APP_CONFIG, AppConfig } from '../config/config.constants';
import { SystemService } from './system.service';

describe('SystemService', () => {
  let service: SystemService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [appConfig],
        }),
      ],
      providers: [SystemService],
    }).compile();

    service = module.get<SystemService>(SystemService);
  });

  it('returns alive health status', () => {
    expect(service.getHealth()).toEqual({ status: 'ok' });
  });

  it('returns application-ready status', () => {
    expect(service.getReady()).toEqual({ status: 'ready' });
  });

  it('returns version metadata from configuration', () => {
    const version = service.getVersion();

    expect(version.name).toBe('heartstone-backend');
    expect(version.apiVersion).toBe('v1');
    expect(version.environment).toBeDefined();
    expect(version).toHaveProperty('build');
  });
});

describe('SystemService with custom config', () => {
  it('uses configured application metadata', async () => {
    process.env.APP_NAME = 'custom-name';
    process.env.API_VERSION = 'v2';
    process.env.NODE_ENV = 'test';
    process.env.BUILD_VERSION = 'abc123';

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [appConfig],
        }),
      ],
      providers: [SystemService],
    }).compile();

    const service = module.get<SystemService>(SystemService);
    const configService = module.get(ConfigService);
    const appConfigValue = configService.getOrThrow<AppConfig>(APP_CONFIG);

    expect(service.getVersion()).toEqual({
      name: appConfigValue.name,
      apiVersion: appConfigValue.apiVersion,
      environment: appConfigValue.nodeEnv,
      build: appConfigValue.buildVersion,
    });

    delete process.env.APP_NAME;
    delete process.env.API_VERSION;
    delete process.env.NODE_ENV;
    delete process.env.BUILD_VERSION;
  });
});
