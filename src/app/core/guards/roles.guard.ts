import { CanMatchFn } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';

import { TokenStore } from '../services/auth/token.store';

/**
 * Roles Guard Factory — tạo guard kiểm tra role của user.
 * @param allowedRoles — danh sách role codes được phép (e.g., ['ADMIN', 'QL-002'])
 *
 * Nếu role đã hydrate và không nằm trong danh sách → redirect /forbidden.
 * Nếu role chưa hydrate (vừa reload, access token chưa có) → cho phép tạm thời,
 * interceptor sẽ refresh và hydrate role.
 */
export const rolesGuard = (allowedRoles: string[]): CanMatchFn => {
  return () => {
    const tokenStore = inject(TokenStore);
    const router = inject(Router);

    // Nếu chưa có refresh token => chưa login
    if (!tokenStore.refreshToken()) {
      return false; // authGuard sẽ xử lý redirect
    }

    const userRole = tokenStore.role();
    // Nếu role đã có, kiểm tra luôn
    if (userRole) {
      if (allowedRoles.includes(userRole)) {
        return true;
      } else {
        router.navigate(['/forbidden']);
        return false;
      }
    }

    // Role chưa hydrate (ví dụ vừa reload trang, access token chưa có)
    // Cho phép tạm thời, interceptor sẽ refresh và hydrate role.
    return true;
  };
};
