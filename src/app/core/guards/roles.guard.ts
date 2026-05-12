import { CanMatchFn } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';

import { TokenStore } from '../services/auth/token.store';

/**
 * Roles Guard Factory — tạo guard kiểm tra role của user.
 * @param allowedRoles — danh sách role codes được phép.
 *   Hỗ trợ exact match ('ADMIN') và prefix wildcard ('QL-*' khớp mọi QL-xxx).
 *
 * Nếu role đã hydrate và không nằm trong danh sách → redirect /forbidden.
 * Nếu role chưa hydrate (vừa reload, access token chưa có) → cho phép tạm thời,
 * interceptor sẽ refresh và hydrate role.
 */
export const rolesGuard = (allowedRoles: string[]): CanMatchFn => {
  return () => {
    const tokenStore = inject(TokenStore);
    const router = inject(Router);

    // Chưa login
    if (!tokenStore.refreshToken()) {
      return false; // authGuard sẽ xử lý redirect
    }

    const userRole = tokenStore.role();
    if (userRole) {
      const allowed = allowedRoles.some((rule) => {
        if (rule.endsWith('*')) {
          // Prefix wildcard: 'QL-*' khớp 'QL-002', 'QL-005', v.v.
          return userRole.startsWith(rule.slice(0, -1));
        }
        return userRole === rule;
      });

      if (allowed) return true;

      router.navigate(['/forbidden']);
      return false;
    }

    // Role chưa hydrate (reload page) → cho qua tạm thời
    return true;
  };
};
