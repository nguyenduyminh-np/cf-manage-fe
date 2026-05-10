import {
  Component,
  DestroyRef,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { BookingRealtimeService } from '../../../core/services/booking-realtime/booking-realtime.service';
import { NotificationApiService } from '../../../core/services/notification/notification-api.service';
import {
  EVENT_LABEL_MAP,
  EVENT_SEVERITY_MAP,
  NotificationItem,
  NotiSeverity,
} from '../../../core/models/booking-noti/booking-noti.model';
import { environment } from '../../../../environments/environment';

/**
 * NotificationBellComponent — Hybrid pattern (API + WebSocket)
 *
 * - Khởi tạo: gọi `GET /notification/my` để load history từ DB
 *   → giải quyết vấn đề mất notification khi refresh
 * - Realtime: subscribe WS streams, mỗi khi có event mới → reload API
 *   (BE đã persist notification vào DB trong @Async thread)
 * - markRead / markAllRead: gọi API + cập nhật signal local
 */
@Component({
  selector: 'app-notification-bell',
  standalone: true,
  templateUrl: './notification-bell.html',
  styleUrl: './notification-bell.scss',
})
export class NotificationBellComponent {
  readonly realtimeService = inject(BookingRealtimeService);
  private readonly notificationApi = inject(NotificationApiService);
  private readonly destroyRef = inject(DestroyRef);

  isOpen = signal(false);
  readonly notifications = signal<NotificationItem[]>([]);
  readonly isLoading = signal(false);
  readonly unreadCount = signal(0);

  constructor() {
    // Kết nối WebSocket
    this.realtimeService.connect(environment.apiUrl);

    // Load lịch sử từ DB ngay khi khởi tạo (giải quyết mất noti khi refresh)
    this.loadFromApi();

    // Mỗi khi có WS event persist-able → BE đã lưu vào DB → reload
    this.realtimeService.bookingUpdates$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadFromApi());

    this.realtimeService.tableAlerts$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadFromApi());

    this.realtimeService.depositEvents$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadFromApi());

    // kitchenOrders KHÔNG persist vào DB (noise cao) — chỉ dùng cho màn hình bếp
    // Không subscribe ở đây
  }

  /**
   * Gọi API lấy 30 notification mới nhất + trạng thái đã đọc.
   * Tự động cập nhật unreadCount.
   */
  private loadFromApi(): void {
    this.isLoading.set(true);
    this.notificationApi.getMyNotifications(0, 30).subscribe({
      next: (page) => {
        this.notifications.set(page.rows);
        this.unreadCount.set(page.rows.filter((n) => !n.read).length);
      },
      error: () => this.isLoading.set(false),
      complete: () => this.isLoading.set(false),
    });
  }

  togglePanel(event: MouseEvent): void {
    event.stopPropagation();
    const willOpen = !this.isOpen();
    this.isOpen.set(willOpen);
    if (willOpen) {
      // Reload khi mở panel để đảm bảo data mới nhất
      this.loadFromApi();
    }
  }

  closePanel(): void {
    this.isOpen.set(false);
  }

  /** Đánh dấu 1 notification đã đọc, cập nhật signal local để UI phản hồi ngay */
  markRead(noti: NotificationItem): void {
    if (noti.read) return;
    this.notificationApi.markRead(noti.id).subscribe(() => {
      this.notifications.update((list) =>
        list.map((n) => (n.id === noti.id ? { ...n, read: true } : n)),
      );
      this.unreadCount.update((c) => Math.max(0, c - 1));
    });
  }

  /** Đánh dấu tất cả đã đọc */
  markAllRead(): void {
    this.notificationApi.markAllRead().subscribe(() => {
      this.notifications.update((list) => list.map((n) => ({ ...n, read: true })));
      this.unreadCount.set(0);
    });
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.closePanel();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closePanel();
  }

  /** Helper: label thân thiện từ eventType/title */
  getLabel(eventType: string): string {
    return EVENT_LABEL_MAP[eventType] ?? eventType;
  }

  /** Helper: severity class từ eventType */
  getSeverityClass(eventType: string): NotiSeverity {
    return EVENT_SEVERITY_MAP[eventType] ?? 'info';
  }

  /** Parse UTC timestamp → giờ local HH:mm */
  formatTime(at: string): string {
    if (!at) return '';
    try {
      return new Date(at).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return at;
    }
  }

  /** Parse UTC timestamp → ngày giờ local dd/MM HH:mm */
  formatDateTime(at: string): string {
    if (!at) return '';
    try {
      return new Date(at).toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
      });
    } catch {
      return at;
    }
  }
}
