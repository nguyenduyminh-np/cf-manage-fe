import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TuiAlertService } from '@taiga-ui/core';
import { catchError, throwError } from 'rxjs';

import { ApiError } from '../models/base/auth.model';

/**
 * Bảng chuyển đổi mã lỗi backend → thông báo tiếng Việt.
 */
const ERROR_CODE_MESSAGES: Record<string, string> = {
  BAD_CREDENTIALS: 'Sai tên đăng nhập hoặc mật khẩu',
  DUPLICATED_USERNAME: 'Tên đăng nhập đã tồn tại',
  AUTH_TOKEN_EXPIRED: 'Phiên làm việc đã hết hạn, vui lòng đăng nhập lại',
  AUTH_TOKEN_REVOKED: 'Phiên làm việc đã bị kết thúc ở nơi khác',
  AUTH_TOKEN_INVALID: 'Token không hợp lệ',
  AUTH_USER_NOT_FOUND: 'Không tìm thấy tài khoản',
  AUTH_TOKEN_ERROR: 'Lỗi xác thực không xác định',
  AUTH_UNAUTHORIZED: 'Bạn chưa đăng nhập',
  ACCESS_DENIED: 'Bạn không có quyền truy cập tài nguyên này',
};

const HTTP_STATUS_MESSAGES: Record<number, string> = {
  403: 'Bạn không có quyền truy cập tài nguyên này',
  404: 'Không tìm thấy tài nguyên',
  500: 'Lỗi máy chủ, vui lòng thử lại sau',
};

/**
 * Global Error Interceptor — hiển thị toast lỗi cho mọi API call thất bại.
 * Trừ /auth/refresh (đã xử lý bên AuthFacade).
 */
export const globalErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const alertService = inject(TuiAlertService);

  // Không hiển thị lỗi cho endpoint refresh (đã xử lý trong facade)
  const EXCLUDED_URLS = ['/auth/refresh'];
  if (EXCLUDED_URLS.some((url) => req.url.includes(url))) {
    return next(req);
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'Đã xảy ra lỗi không xác định';

      if (error.error instanceof ErrorEvent) {
        // Client-side error (network, etc.)
        errorMessage = error.error.message;
      } else {
        // Server-side error
        const apiError = error.error as ApiError;
        if (apiError?.message) {
          errorMessage = apiError.message;
        } else if (apiError?.code) {
          errorMessage = ERROR_CODE_MESSAGES[apiError.code] || `Lỗi: ${apiError.code}`;
        } else {
          errorMessage = HTTP_STATUS_MESSAGES[error.status] || `Lỗi HTTP ${error.status}`;
        }
      }

      alertService.open(errorMessage, { appearance: 'error' }).subscribe();
      return throwError(() => error);
    }),
  );
};
