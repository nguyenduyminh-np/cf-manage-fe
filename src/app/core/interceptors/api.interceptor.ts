import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

const API_PREFIX = '/api/v1';

export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  // Nếu đã là URL tuyệt đối → bỏ qua (VD: call external API)
  if (req.url.startsWith('http')) {
    return next(req);
  }

  const fullUrl = `${environment.apiUrl}${API_PREFIX}${req.url}`;

  const cloned = req.clone({
    url: fullUrl,
  });

  return next(cloned);
};
