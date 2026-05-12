import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { TuiAlertService } from '@taiga-ui/core';
import { catchError, switchMap, throwError } from 'rxjs';

import { ApiError } from '../models/base/auth.model';
import { AuthFacade } from '../facade/auth.facade';
import { TokenStore } from '../services/auth/token.store';

/**
 * Auth Interceptor — gắn Bearer token vào mọi request (trừ /auth/).
 *
 * Ngoài ra xử lý trường hợp browser throttle setTimeout (tab inactive/sleep)
 * khiến pre-emptive refresh timer không fires đúng giờ:
 * → Trước mỗi request, kiểm tra isAccessExpired(). Nếu expired nhưng còn
 *   refreshToken → tự động refresh trước, rồi mới gửi request kèm token mới.
 *
 * Xử lý 401: phân biệt AUTH_TOKEN_REVOKED vs AUTH_TOKEN_EXPIRED.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenStore = inject(TokenStore);
  const authFacade = inject(AuthFacade);
  const alertService = inject(TuiAlertService);
  const router = inject(Router);

  // Bỏ qua gắn token cho các endpoint auth
  if (req.url.includes('/auth/')) {
    return next(req);
  }

  // ── Pre-request check: access token expired nhưng còn refresh token ──
  // Xảy ra khi browser throttle setTimeout (tab background, máy sleep, v.v.)
  if (tokenStore.isAccessExpired() && tokenStore.refreshToken()) {
    return authFacade.refresh().pipe(
      switchMap(() => {
        // Sau khi refresh thành công → thông báo và gửi lại request với token mới
        alertService
          .open('Phiên làm việc đã được gia hạn tự động.', { appearance: 'info' })
          .subscribe();

        const newToken = tokenStore.accessToken();
        const retried = req.clone({
          setHeaders: { Authorization: `Bearer ${newToken}` },
        });
        return next(retried);
      }),
      catchError((err) => {
        // Refresh thất bại → buộc đăng nhập lại
        tokenStore.clear();
        router.navigate(['/login']);
        return throwError(() => err);
      }),
    );
  }

  // ── Token còn hạn → gắn bình thường ──
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
        // Token bị revoke từ xa (logout ở thiết bị khác)
        if (apiError?.code === 'AUTH_TOKEN_REVOKED') {
          tokenStore.clear();
          router.navigate(['/login'], {
            queryParams: { reason: 'session_revoked' },
          });
        }
        // Token hết hạn nhưng interceptor check chưa kịp refresh
        else if (apiError?.code === 'AUTH_TOKEN_EXPIRED') {
          tokenStore.clear();
          router.navigate(['/login']);
        }
      }
      return throwError(() => error);
    }),
  );
};
