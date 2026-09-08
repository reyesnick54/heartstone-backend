import { Test, type TestingModule } from '@nestjs/testing';

import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let prisma: PrismaService;
  let moduleRef: TestingModule;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    await prisma.onModuleInit();
  });

  afterEach(async () => {
    await prisma.onModuleDestroy();
    await moduleRef.close();
  });

  it('connects on module init', async () => {
    expect(await prisma.isHealthy()).toBe(true);
  });

  it('disconnects cleanly on module destroy', async () => {
    await expect(prisma.onModuleDestroy()).resolves.toBeUndefined();
  });
});
