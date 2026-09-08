import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export function handlePrismaUniqueConstraint(
  error: unknown,
  conflictMessage: string,
): never | void {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    throw new ConflictException(conflictMessage);
  }
}
