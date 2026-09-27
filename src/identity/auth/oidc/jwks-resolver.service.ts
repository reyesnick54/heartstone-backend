import { Injectable } from '@nestjs/common';
import { createRemoteJWKSet, type JWTVerifyGetKey } from 'jose';

export interface JwksResolver {
  resolve(jwksUri: string): JWTVerifyGetKey;
}

@Injectable()
export class RemoteJwksResolverService implements JwksResolver {
  private readonly cache = new Map<string, JWTVerifyGetKey>();

  resolve(jwksUri: string): JWTVerifyGetKey {
    const cached = this.cache.get(jwksUri);
    if (cached) {
      return cached;
    }

    const resolver = createRemoteJWKSet(new URL(jwksUri));
    this.cache.set(jwksUri, resolver);
    return resolver;
  }
}

@Injectable()
export class InMemoryJwksResolverService implements JwksResolver {
  private readonly resolvers = new Map<string, JWTVerifyGetKey>();

  register(jwksUri: string, resolver: JWTVerifyGetKey): void {
    this.resolvers.set(jwksUri, resolver);
  }

  has(jwksUri: string): boolean {
    return this.resolvers.has(jwksUri);
  }

  resolve(jwksUri: string): JWTVerifyGetKey {
    const resolver = this.resolvers.get(jwksUri);
    if (!resolver) {
      throw new Error(`No in-memory JWKS registered for ${jwksUri}`);
    }
    return resolver;
  }
}

@Injectable()
export class CompositeJwksResolverService implements JwksResolver {
  constructor(
    private readonly inMemoryJwksResolver: InMemoryJwksResolverService,
    private readonly remoteJwksResolver: RemoteJwksResolverService,
  ) {}

  resolve(jwksUri: string): JWTVerifyGetKey {
    if (this.inMemoryJwksResolver.has(jwksUri)) {
      return this.inMemoryJwksResolver.resolve(jwksUri);
    }

    return this.remoteJwksResolver.resolve(jwksUri);
  }
}
