import { ServicePackGovernanceBoundaryService } from '../src/service-packs/governance/service-pack-governance-boundary.service';

describe('Service pack governance integration (boundary)', () => {
  it('loads governance boundary service for integration suite wiring', () => {
    const boundary = new ServicePackGovernanceBoundaryService();
    expect(boundary).toBeDefined();
  });
});
