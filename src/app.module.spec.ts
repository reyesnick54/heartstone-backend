import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './app.module';
import { PrismaService } from './database/prisma.service';

describe('AppModule', () => {
  let moduleRef: TestingModule;

  afterEach(async () => {
    if (moduleRef) {
      await moduleRef.close();
    }
  });

  it('boots the application', async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    expect(moduleRef).toBeDefined();
    expect(moduleRef.get(AppModule)).toBeDefined();
  });

  it('initializes PrismaService', async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const prisma = moduleRef.get(PrismaService);
    expect(prisma).toBeDefined();
    expect(await prisma.isHealthy()).toBe(true);
  });
});
