/**
 * Decode JWT payload part (Base64url) without verifying signature.
 * FE chỉ cần decode payload — verification là trách nhiệm của Backend (RS256).
 */
export function decodeJwtPayload<T>(token: string): T {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT');
  }
  const payload = parts[1];
  const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
  return JSON.parse(decoded);
}

/**
 * Kiểm tra JWT đã hết hạn chưa dựa trên claim `exp`.
 * @param exp — seconds since epoch
 */
export function isJwtExpired(exp: number): boolean {
  return Date.now() >= exp * 1000;
}
