declare module 'jwks-client' {
  interface JwksClientOptions {
    jwksUri: string;
    cache?: boolean;
    cacheMaxAge?: number;
    rateLimit?: boolean;
    jwksRequestsPerMinute?: number;
  }

  interface SigningKey {
    getPublicKey(): string;
  }

  interface JwksClient {
    getSigningKey(kid: string, callback: (err: Error | null, key?: SigningKey) => void): void;
  }

  function jwksClient(options: JwksClientOptions): JwksClient;
  export = jwksClient;
}
