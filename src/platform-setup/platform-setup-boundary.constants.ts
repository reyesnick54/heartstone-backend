/**
 * Platform setup holds jurisdiction and institution deployment configuration
 * (reference seeds, service packs, institution-specific policy content).
 * Setup may depend on core; core must not import setup modules.
 */
export const PLATFORM_SETUP_BOUNDARY_MARKER = 'HEARTSTONE_PLATFORM_SETUP';
