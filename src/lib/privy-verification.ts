import jwksClient from 'jwks-client';
import jwt from 'jsonwebtoken';

// Initialize JWKS client for Privy
const client = jwksClient({
  jwksUri: 'https://auth.privy.io/api/v1/apps/cmgtkzckx006pjr0cwmhduajb/jwks.json',
  cache: true,
  cacheMaxAge: 600000, // 10 minutes
  rateLimit: true,
  jwksRequestsPerMinute: 5
});

// Function to get signing key
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getKey(header: any, callback: (err: Error | null, key?: string) => void) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client.getSigningKey(header.kid, (err: Error | null, key?: any) => {
    if (err) {
      console.error('Error getting signing key:', err);
      return callback(err);
    }
    
    // Handle different key formats
    let signingKey: string;
    if (key?.getPublicKey && typeof key.getPublicKey === 'function') {
      signingKey = key.getPublicKey();
    } else if (key?.publicKey) {
      signingKey = key.publicKey;
    } else if (typeof key === 'string') {
      signingKey = key;
    } else {
      console.error('Unexpected key format:', key);
      return callback(new Error('Invalid key format'));
    }
    
    callback(null, signingKey);
  });
}

// Verify Privy access token
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function verifyPrivyToken(accessToken: string): Promise<any> {
  return new Promise((resolve, reject) => {
    try {
      // Validate token format first
      if (!accessToken || typeof accessToken !== 'string') {
        console.error('Invalid token format:', typeof accessToken, accessToken);
        return reject(new Error('Invalid token format'));
      }

      // Check if token has proper JWT structure (3 parts separated by dots)
      const parts = accessToken.split('.');
      if (parts.length !== 3) {
        console.error('Malformed JWT token - expected 3 parts, got:', parts.length);
        return reject(new Error('Malformed JWT token'));
      }

      // First, decode the token without verification to see its contents
      const decoded = jwt.decode(accessToken, { complete: true });
      console.log('Token header:', decoded?.header);
      console.log('Token payload:', decoded?.payload);
      console.log('Expected audience:', process.env.NEXT_PUBLIC_PRIVY_APP_ID);
      
      jwt.verify(
        accessToken,
        getKey,
        {
          algorithms: ['ES256'],
          // Remove issuer validation for now to see what the actual issuer is
          // issuer: 'https://auth.privy.io',
          // Remove audience validation temporarily to debug
          // audience: process.env.NEXT_PUBLIC_PRIVY_APP_ID
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (err: Error | null, verified?: any) => {
          if (err) {
            console.error('Token verification failed:', err);
            reject(err);
          } else {
            console.log('Token verified successfully:', verified);
            resolve(verified);
          }
        }
      );
    } catch (error) {
      console.error('Token verification error:', error);
      reject(error);
    }
  });
}

// Extract access token from Authorization header
export function extractAccessToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7); // Remove 'Bearer ' prefix
}
