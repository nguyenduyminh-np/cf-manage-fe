import { computed, Injectable, signal } from '@angular/core';

import { JwtPayload } from '../../models/base/auth.model';
import { decodeJwtPayload, isJwtExpired } from '../../../shared/utils/jwt.utils';

/**
 * Signal-based Token Store.
 * - Access Token: chỉ giữ trong RAM (signal), không persist — bảo mật hơn.
 * - Refresh Token, role, uid: persist vào localStorage để khôi phục session khi reload.
 */
@Injectable({ providedIn: 'root' })
export class TokenStore {
  // RAM only
  private readonly _accessToken = signal<string | null>(null);

  // Persisted
  private readonly _refreshToken = signal<string | null>(localStorage.getItem('refresh_token'));
  private readonly _role = signal<string | null>(localStorage.getItem('role'));
  private readonly _uid = signal<string | null>(localStorage.getItem('uid'));

  readonly accessToken = this._accessToken.asReadonly();
  readonly refreshToken = this._refreshToken.asReadonly();
  readonly role = this._role.asReadonly();
  readonly uid = this._uid.asReadonly();

  // Computed
  readonly isLoggedIn = computed(() => !!this.accessToken() || !!this.refreshToken());
  readonly isAccessExpired = computed(() => {
    const token = this.accessToken();
    if (!token) return true;
    try {
      const payload = decodeJwtPayload<JwtPayload>(token);
      return isJwtExpired(payload.exp);
    } catch {
      return true;
    }
  });

  /**
   * Lưu cả access + refresh token sau khi login/register/refresh thành công.
   * Decode JWT payload để trích xuất role, uid.
   */
  setTokens(accessToken: string, refreshToken: string): void {
    this._accessToken.set(accessToken);
    this._refreshToken.set(refreshToken);
    localStorage.setItem('refresh_token', refreshToken);

    // Giải mã và lưu profile
    const payload = decodeJwtPayload<JwtPayload>(accessToken);
    this._role.set(payload.role);
    this._uid.set(payload.uid.toString());
    localStorage.setItem('role', payload.role);
    localStorage.setItem('uid', payload.uid.toString());
  }

  /**
   * Xóa toàn bộ token và profile — gọi khi logout hoặc session hết hạn.
   */
  clear(): void {
    this._accessToken.set(null);
    this._refreshToken.set(null);
    this._role.set(null);
    this._uid.set(null);
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('role');
    localStorage.removeItem('uid');
  }

  /**
   * Khôi phục profile từ localStorage khi app khởi động (chưa có access token).
   */
  restoreProfileFromStorage(): void {
    const role = localStorage.getItem('role');
    const uid = localStorage.getItem('uid');
    if (role) this._role.set(role);
    if (uid) this._uid.set(uid);
  }
}
