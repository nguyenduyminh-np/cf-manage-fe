import { CanMatchFn } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';

import { TokenStore } from '../services/auth/token.store';

/**
 * Auth Guard — chặn truy cập protected routes khi chưa login.
 * Kiểm tra có access token hoặc refresh token (để cover trường hợp reload page).
 * Nếu chưa login → redirect về /login.
 */
export const authGuard: CanMatchFn = () => {
  const tokenStore = inject(TokenStore);
  const router = inject(Router);

  if (tokenStore.accessToken() || tokenStore.refreshToken()) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};
