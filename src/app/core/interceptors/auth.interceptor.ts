import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { ApiError } from '../models/base/auth.model';
import { TokenStore } from '../services/auth/token.store';

/**
 * Auth Interceptor — gắn Bearer token vào mọi request (trừ /auth/).
 * Xử lý 401: phân biệt AUTH_TOKEN_REVOKED vs AUTH_TOKEN_EXPIRED.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenStore = inject(TokenStore);
  const router = inject(Router);

  // Bỏ qua gắn token cho các endpoint auth
  if (req.url.includes('/auth/')) {
    return next(req);
  }

  const token = tokenStore.accessToken();
  if (token) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        const apiError = error.error as ApiError;
        // Kiểm tra nếu token bị revoke (do logout ở nơi khác)
        if (apiError?.code === 'AUTH_TOKEN_REVOKED') {
          tokenStore.clear();
          router.navigate(['/login'], {
            queryParams: { reason: 'session_revoked' },
          });
        }
        // Với AUTH_TOKEN_EXPIRED, pre-emptive refresh nên đã xử lý,
        // nhưng nếu vẫn xảy ra thì logout và yêu cầu login lại.
        else if (apiError?.code === 'AUTH_TOKEN_EXPIRED') {
          tokenStore.clear();
          router.navigate(['/login']);
        }
      }
      return throwError(() => error);
    }),
  );
};
