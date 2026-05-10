import { Injectable, NgZone, inject, signal } from '@angular/core';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { Subject } from 'rxjs';

import { BookingNotiEnvelope } from '../../models/booking-noti/booking-noti.model';

/** STOMP topic constants */
export const WS_TOPICS = {
  BOOKING_UPDATES: '/topic/booking-updates',
  TABLE_STATUS: '/topic/table-status',
  TABLE_ALERTS: '/topic/table-alerts',
  DEPOSIT_EVENTS: '/topic/deposit-events',
  KITCHEN_ORDERS: '/topic/kitchen-orders', // ORDER_CREATED / ORDER_READY / ORDER_CANCELLED
} as const;

/**
 * BookingRealtimeService
 *
 * Quản lý kết nối WebSocket STOMP tới backend CF-M.
 * - Dùng **native WebSocket** (không dùng SockJS để tránh lỗi `global is not defined`
 *   với esbuild). Spring STOMP hỗ trợ native WS tại path `/ws/websocket`.
 * - `brokerURL` tự động chuyển `http://` → `ws://` và `https://` → `wss://`.
 * - Tự reconnect sau 5 giây khi bị ngắt.
 * - Dedup ở phía BE (Redis SET NX 45 phút) — FE không cần dedup thêm.
 * - Cung cấp 5 `Subject` stream + 1 signal `connected` cho component bind.
 *
 * Sử dụng:
 * ```ts
 * readonly realtimeService = inject(BookingRealtimeService);
 * // trong constructor:
 * this.realtimeService.connect(environment.apiUrl);
 * ```
 */
@Injectable({ providedIn: 'root' })
export class BookingRealtimeService {
  //Angular 21: inject() thay constructor injection
  private readonly ngZone = inject(NgZone);

  private client!: Client;
  private stompSubs: StompSubscription[] = [];

  // RxJS Subject — giữ cho WebSocket event stream (reactive pipeline)
  readonly bookingUpdates$ = new Subject<BookingNotiEnvelope>();
  readonly tableStatus$ = new Subject<BookingNotiEnvelope>();
  readonly tableAlerts$ = new Subject<BookingNotiEnvelope>();
  readonly depositEvents$ = new Subject<BookingNotiEnvelope>();
  readonly kitchenOrders$ = new Subject<BookingNotiEnvelope>(); // ← Mới

  //  Signal cho connection status — component bind trực tiếp, không cần async pipe
  readonly connected = signal(false);

  /**
   * Kết nối tới WebSocket endpoint bằng native WebSocket.
   * Guard: nếu đã kết nối (`client.active`) thì không tạo lại.
   *
   * @param backendBaseUrl  HTTP URL của backend, vd: "http://localhost:8080"
   */
  connect(backendBaseUrl: string): void {
    if (this.client?.active) return;

    // Chuyển http(s):// → ws(s):// để dùng native WebSocket
    // Spring STOMP SockJS endpoint hỗ trợ native WS tại /ws/websocket
    const brokerURL =
      backendBaseUrl
        .replace(/^https:\/\//i, 'wss://')
        .replace(/^http:\/\//i, 'ws://')
        .replace(/\/+$/, '') + '/ws/websocket';

    this.client = new Client({
      brokerURL,
      reconnectDelay: 5000,
      onConnect: () => {
        this.connected.set(true);
        this.onConnected();
      },
      onDisconnect: () => this.connected.set(false),
      onWebSocketClose: () => this.connected.set(false),
      onStompError: (frame) => console.error('[WS] STOMP error', frame),
    });

    this.client.activate();
  }

  /** Đăng ký 5 topic sau khi STOMP handshake thành công. */
  private onConnected(): void {
    this.stompSubs.push(
      this.client.subscribe(WS_TOPICS.BOOKING_UPDATES, (msg) =>
        this.dispatch(msg, this.bookingUpdates$),
      ),
      this.client.subscribe(WS_TOPICS.TABLE_STATUS, (msg) =>
        this.dispatch(msg, this.tableStatus$),
      ),
      this.client.subscribe(WS_TOPICS.TABLE_ALERTS, (msg) =>
        this.dispatch(msg, this.tableAlerts$),
      ),
      this.client.subscribe(WS_TOPICS.DEPOSIT_EVENTS, (msg) =>
        this.dispatch(msg, this.depositEvents$),
      ),
      this.client.subscribe(WS_TOPICS.KITCHEN_ORDERS, (msg) =>
        this.dispatch(msg, this.kitchenOrders$),
      ),
    );
  }

  /**
   * Parse JSON từ STOMP frame body và emit vào Subject tương ứng.
   * NgZone.run() bắt buộc cho zone-based project để kích hoạt change detection.
   */
  private dispatch(msg: IMessage, subject: Subject<BookingNotiEnvelope>): void {
    try {
      const envelope: BookingNotiEnvelope = JSON.parse(msg.body);
      this.ngZone.run(() => subject.next(envelope));
    } catch (e) {
      console.warn('[WS] Failed to parse message', msg.body, e);
    }
  }

  /** Ngắt kết nối và dọn dẹp tất cả STOMP subscription. */
  disconnect(): void {
    this.stompSubs.forEach((s) => s.unsubscribe());
    this.stompSubs = [];
    this.client?.deactivate();
    this.connected.set(false);
  }
}
