import { Injectable, NotFoundException } from '@nestjs/common';

import { ServicePackInventoryService } from './service-pack-inventory.service';
import {
  type ServicePackRegistryEntry,
  type ServicePackRegistryInventorySnapshot,
} from './service-pack-registry.types';

@Injectable()
export class ServicePackRegistryService {
  constructor(private readonly inventory: ServicePackInventoryService) {}

  async listRegistry(): Promise<ServicePackRegistryInventorySnapshot> {
    const packs = await this.inventory.loadPacks({});
    const entries = packs.map((pack) => this.inventory.mapPackToRegistryEntry(pack));
    return this.inventory.buildInventorySnapshot(entries);
  }

  async getRegistryEntry(servicePackId: string): Promise<ServicePackRegistryInventorySnapshot> {
    const packs = await this.inventory.loadPacks({ servicePackId });
    if (packs.length === 0) {
      throw new NotFoundException(`Service pack ${servicePackId} not found in registry`);
    }
    const entries = packs.map((pack) => this.inventory.mapPackToRegistryEntry(pack));
    return this.inventory.buildInventorySnapshot(entries);
  }

  async listByJurisdiction(jurisdictionId: string): Promise<ServicePackRegistryInventorySnapshot> {
    const packs = await this.inventory.loadPacks({ jurisdictionId });
    const entries = packs.map((pack) => this.inventory.mapPackToRegistryEntry(pack));
    return this.inventory.buildInventorySnapshot(entries);
  }

  async listByInstitution(institutionId: string): Promise<ServicePackRegistryInventorySnapshot> {
    const packs = await this.inventory.loadPacks({ institutionId });
    const entries = packs.map((pack) => this.inventory.mapPackToRegistryEntry(pack));
    return this.inventory.buildInventorySnapshot(entries);
  }

  async getRegistryEntrySummary(servicePackId: string): Promise<ServicePackRegistryEntry> {
    const packs = await this.inventory.loadPacks({ servicePackId });
    if (packs.length === 0) {
      throw new NotFoundException(`Service pack ${servicePackId} not found in registry`);
    }
    const pack = packs[0];
    if (!pack) {
      throw new NotFoundException(`Service pack ${servicePackId} not found in registry`);
    }
    return this.inventory.mapPackToRegistryEntry(pack);
  }
}
