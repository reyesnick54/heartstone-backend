import { BadRequestException } from '@nestjs/common';
import { FormFieldType, FormVersionStatus } from '@prisma/client';

import { type PrismaService } from '../../database/prisma.service';
import { FormConditionalLogicService } from './form-conditional-logic.service';
import { FormVersionsService } from './form-versions.service';

describe('FormVersionsService', () => {
  const prisma = {
    formDefinition: {
      findUnique: jest.fn(),
    },
    formVersion: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
  } as unknown as PrismaService;

  const conditionalLogic = new FormConditionalLogicService();
  const service = new FormVersionsService(prisma, conditionalLogic);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects updates to published form versions', async () => {
    (prisma.formVersion.findUnique as jest.Mock).mockResolvedValue({
      id: 'version-1',
      status: FormVersionStatus.PUBLISHED,
    });

    await expect(
      service.updateDraft('version-1', { title: { default: 'Updated' } }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects sensitive default values during version creation', async () => {
    (prisma.formDefinition.findUnique as jest.Mock).mockResolvedValue({ id: 'definition-1' });
    (prisma.formVersion.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(
      service.create({
        formDefinitionId: 'definition-1',
        title: { default: 'Form' },
        sections: [
          {
            sectionKey: 'main',
            title: { default: 'Main' },
            displayOrder: 1,
            fields: [
              {
                fieldKey: 'email',
                label: { default: 'Email' },
                fieldType: FormFieldType.EMAIL,
                displayOrder: 1,
                defaultValue: 'secret@example.com',
              },
            ],
          },
        ],
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
