import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, Observable, of, tap, throwError } from 'rxjs';

import { AuthResponse, LoginRequest, RegisterRequest, UserInfo } from '../models/base/auth.model';
import { AuthApi } from '../services/auth/auth.api';
import { TokenStore } from '../services/auth/token.store';

/**
 * Auth Facade — orchestrator trung tâm cho mọi logic authentication.
 *
 * Responsibilities:
 * - Điều phối login/register/refresh/logout
 * - Quản lý pre-emptive refresh timer (làm mới trước 5 phút hết hạn)
 * - Khôi phục session khi app khởi động
 */
@Injectable({ providedIn: 'root' })
export class AuthFacade {
  private static readonly CURRENT_USER_INFO_KEY = 'CURRENT_USER_INFO';

  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly authApi = inject(AuthApi);
  private readonly tokenStore = inject(TokenStore);
  private readonly router = inject(Router);

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.authApi.login(credentials).pipe(
      tap((res) => this.handleAuthSuccess(res, true)),
      catchError((err) => {
        // Để global error interceptor hiển thị
        return throwError(() => err);
      }),
    );
  }

  register(data: RegisterRequest): Observable<AuthResponse> {
    return this.authApi.register(data).pipe(tap((res) => this.handleAuthSuccess(res)));
  }

  refresh(): Observable<AuthResponse> {
    const refreshToken = this.tokenStore.refreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token'));
    }
    return this.authApi.refresh({ refreshToken }).pipe(
      tap((res) => this.handleAuthSuccess(res)),
      catchError((err) => {
        this.logout(false); // silent logout
        return throwError(() => err);
      }),
    );
  }

  logout(shouldCallApi = true): Observable<AuthResponse | null> {
    this.cancelRefreshTimer();
    const refreshToken = this.tokenStore.refreshToken();

    const logout$ =
      refreshToken && shouldCallApi
        ? this.authApi.logout({ refreshToken }).pipe(catchError(() => of(null)))
        : of(null);

    return logout$.pipe(
      tap(() => {
        sessionStorage.removeItem(AuthFacade.CURRENT_USER_INFO_KEY);
        this.tokenStore.clear();
        this.router.navigate(['/login']);
      }),
    );
  }

  public getUserInfo(): UserInfo | null {
    const rawValue = sessionStorage.getItem(AuthFacade.CURRENT_USER_INFO_KEY);
    if (!rawValue) {
      return null;
    }

    try {
      const parsed = JSON.parse(rawValue) as Partial<UserInfo>;

      if (typeof parsed.full_name !== 'string' || typeof parsed.phone_number !== 'string') {
        return null;
      }

      return {
        full_name: parsed.full_name,
        phone_number: parsed.phone_number,
      };
    } catch {
      return null;
    }
  }

  /**
   * Gọi khi app khởi động để khôi phục session.
   * Nếu có refresh token trong localStorage → tự động refresh để lấy access token mới.
   */
  restoreSession(): void {
    this.tokenStore.restoreProfileFromStorage();
    const refreshToken = this.tokenStore.refreshToken();
    if (refreshToken) {
      this.refresh().subscribe({
        error: () => this.tokenStore.clear(),
      });
    }
  }

  private handleAuthSuccess(res: AuthResponse, shouldStoreUserInfo = false): void {
    this.tokenStore.setTokens(res.accessToken, res.refreshToken);

    if (shouldStoreUserInfo && res.user_info) {
      sessionStorage.setItem(
        AuthFacade.CURRENT_USER_INFO_KEY,
        JSON.stringify(res.user_info),
      );
    }

    this.scheduleRefresh(res.expiresInSeconds);
  }

  /**
   * Pre-emptive refresh — lên lịch refresh trước 5 phút (300s) khi token hết hạn.
   */
  private scheduleRefresh(expiresInSeconds: number): void {
    this.cancelRefreshTimer();
    const delaySeconds = Math.max(0, expiresInSeconds - 300); // 5 phút buffer
    const delayMs = delaySeconds * 1000;
    console.log(`[Auth] Scheduling refresh in ${delaySeconds} seconds`);
    this.refreshTimer = setTimeout(() => {
      this.refresh().subscribe();
    }, delayMs);
  }

  private cancelRefreshTimer(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}
