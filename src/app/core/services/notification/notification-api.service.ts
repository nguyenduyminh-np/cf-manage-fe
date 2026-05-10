import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import {
  NotificationItem,
  NotificationPageResponse,
} from '../../models/booking-noti/booking-noti.model';

/**
 * NotificationApiService
 *
 * Tương tác với REST API `/api/v1/notification`:
 * - `GET /my` — lấy danh sách notification phân trang, mới nhất trước
 * - `POST /read` — đánh dấu 1 notification đã đọc (lazy insert vào notification_read)
 * - `POST /read-all` — đánh dấu tất cả đã đọc
 *
 * BE dùng Shared Notification model: 1 row/event trong bảng `notification`,
 * trạng thái đọc của từng nhân viên lưu riêng trong `notification_read`.
 */
@Injectable({ providedIn: 'root' })
export class NotificationApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/v1/notification`;

  /**
   * Lấy danh sách notification của nhân viên hiện tại (từ JWT).
   * BE query 2 bảng — không N+1.
   */
  getMyNotifications(page = 0, size = 30): Observable<NotificationPageResponse> {
    return this.http
      .get<{ data: NotificationPageResponse }>(`${this.base}/my`, {
        params: { page, size },
      })
      .pipe(map((res) => res.data));
  }

  /**
   * Đánh dấu 1 notification đã đọc.
   * BE INSERT vào notification_read (idempotent — UNIQUE KEY bảo vệ).
   */
  markRead(id: number): Observable<void> {
    return this.http.post<void>(`${this.base}/read`, { id });
  }

  /**
   * Đánh dấu tất cả notification chưa đọc là đã đọc.
   * BE dùng INSERT … SELECT để batch insert — 1 SQL.
   */
  markAllRead(): Observable<void> {
    return this.http.post<void>(`${this.base}/read-all`, {});
  }
}
