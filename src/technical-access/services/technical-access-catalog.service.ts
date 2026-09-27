import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { TechnicalAccessLevel } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ACCESS_LEVEL_PERMISSIONS } from '../config/access-level-policy.config';
import { BOOTSTRAP_TECHNICAL_ROLES } from '../config/technical-access-bootstrap.config';
import { ALL_PERMISSION_DEFINITIONS } from '../constants/permission-codes.constants';

@Injectable()
export class TechnicalAccessCatalogService implements OnModuleInit {
  private readonly logger = new Logger(TechnicalAccessCatalogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.syncCatalog();
  }

  async syncCatalog(): Promise<void> {
    await this.syncPermissions();
    await this.syncAccessLevelMappings();
    await this.syncBootstrapRoles();
  }

  async syncPermissions(): Promise<void> {
    for (const definition of ALL_PERMISSION_DEFINITIONS) {
      await this.prisma.technicalPermission.upsert({
        where: { code: definition.code },
        create: {
          code: definition.code,
          description: definition.description,
          domain: definition.domain,
        },
        update: {
          description: definition.description,
          domain: definition.domain,
        },
      });
    }
  }

  async syncAccessLevelMappings(): Promise<void> {
    const levels = Object.keys(ACCESS_LEVEL_PERMISSIONS) as TechnicalAccessLevel[];

    for (const level of levels) {
      const codes = ACCESS_LEVEL_PERMISSIONS[level];
      for (const code of codes) {
        const permission = await this.prisma.technicalPermission.findUnique({
          where: { code },
        });
        if (!permission) {
          this.logger.warn(`Skipping access level mapping; permission missing: ${code}`);
          continue;
        }

        await this.prisma.technicalAccessLevelPermission.upsert({
          where: {
            accessLevel_permissionId: {
              accessLevel: level,
              permissionId: permission.id,
            },
          },
          create: {
            accessLevel: level,
            permissionId: permission.id,
          },
          update: {},
        });
      }
    }
  }

  async syncBootstrapRoles(): Promise<void> {
    for (const roleDef of BOOTSTRAP_TECHNICAL_ROLES) {
      const role = await this.prisma.technicalRole.upsert({
        where: { code: roleDef.code },
        create: {
          code: roleDef.code,
          name: roleDef.name,
          description: roleDef.description,
          accessLevel: roleDef.accessLevel,
          isSystemRole: true,
        },
        update: {
          name: roleDef.name,
          description: roleDef.description,
          accessLevel: roleDef.accessLevel,
        },
      });

      for (const permissionCode of roleDef.permissionCodes) {
        const permission = await this.prisma.technicalPermission.findUnique({
          where: { code: permissionCode },
        });
        if (!permission) {
          continue;
        }

        await this.prisma.technicalRolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId: permission.id,
            },
          },
          create: {
            roleId: role.id,
            permissionId: permission.id,
          },
          update: {},
        });
      }
    }
  }
}
