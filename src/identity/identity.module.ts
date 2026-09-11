import { Module } from '@nestjs/common';

/**
 * Phase 3A: Identity & Access domain boundary.
 *
 * This module establishes the canonical identity data model boundary.
 * Authentication flows, authorization, and RBAC are out of scope for this slice.
 *
 * Architectural invariant: User != Officeholder != Role != Permission != Authority
 */
@Module({})
export class IdentityModule {}
