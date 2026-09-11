import { BadRequestException } from '@nestjs/common';

export function assertStatusTransition<T extends string>(
  current: T,
  allowedFrom: readonly T[],
  target: T,
  entityLabel: string,
): void {
  if (!allowedFrom.includes(current)) {
    throw new BadRequestException(
      `Cannot transition ${entityLabel} from "${current}" to "${target}"`,
    );
  }
}

export function assertNotTerminal<T extends string>(
  current: T,
  terminalStatuses: readonly T[],
  entityLabel: string,
): void {
  if (terminalStatuses.includes(current)) {
    throw new BadRequestException(`${entityLabel} is in terminal status "${current}"`);
  }
}
