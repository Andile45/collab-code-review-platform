import jwt from "jsonwebtoken";

/**
 * JWT utility functions.
 * JWT_SECRET MUST be set in the environment — no insecure fallback.
 */

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("❌ FATAL: JWT_SECRET environment variable is not set.");
  process.exit(1);
}

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

/**
 * Sign a JWT payload and return the token string.
 * @param payload  Data to encode (e.g. { id, email, role })
 */
export function signJwt(payload: object): string {
  return jwt.sign(payload, JWT_SECRET!, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
}

/**
 * Verify and decode a JWT token.
 * Throws if the token is invalid or expired.
 * @param token  The JWT string to verify
 */
export function verifyJwt<T = any>(token: string): T {
  return jwt.verify(token, JWT_SECRET!) as T;
}
