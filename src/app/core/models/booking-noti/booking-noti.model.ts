/** Envelope chuẩn cho mọi WebSocket message từ CF-M backend.
 *  Được chuẩn hoá bởi BookingNotificationServiceImpl.normalizePayload() phía BE.
 */
export interface BookingNotiEnvelope {
  /** Tên sự kiện — xem WS_EVENTS để biết đầy đủ */
  event: string;
  /** Mô tả ngắn sự kiện */
  message: string;
  /** Nguồn phát: "SCHEDULER" | "BOOKING_MUTATION_AFTER_COMMIT" */
  source: string;
  /** Thời điểm xảy ra — ISO-8601 UTC string */
  at: string;
  /** Topic STOMP đã gửi */
  topic: string;
  /** Redis dedup key */
  dedupKey: string;
  /** UUID duy nhất — dùng làm track key trong @for */
  eventId: string;

  // --- Booking fields ---
  bookingId?: number;
  bookingStatus?: string;
  mutationType?: string;
  tableId?: number;
  tableCode?: string;
  tableStatus?: string;
  expectedArriveTime?: string;
  expectedCheckOut?: string;

  // --- Kitchen order fields (mới) ---
  orderId?: number;

  // --- Payment fields (mới) ---
  invoiceCode?: string;
  totalAmount?: number;
}

/** DB-persisted notification từ API GET /notification/my */
export interface NotificationItem {
  id: number;
  /** WS event name, vd: "TABLE_OCCUPIED_CONFLICT" */
  title: string;
  /** Mô tả từ backend (Tiếng Việt) */
  description: string;
  /** WS topic: "/topic/table-alerts" */
  url: string;
  /** ISO-8601 UTC */
  createdAt: string;
  /** false nếu chưa có row trong notification_read */
  read: boolean;
  eventType: string;
  topic: string;
}

export interface NotificationPageResponse {
  rows: NotificationItem[];
  pageNo: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
}

/** Severity level của notification để render màu badge/toast */
export type NotiSeverity = 'info' | 'success' | 'warning' | 'error';

/** Map từng event name → severity để render UI */
export const EVENT_SEVERITY_MAP: Record<string, NotiSeverity> = {
  BOOKING_CREATED: 'success',
  BOOKING_CONFIRMED: 'success',
  BOOKING_CHECKED_IN: 'success',
  BOOKING_CHECKED_OUT: 'info',
  BOOKING_CANCELLED: 'error',
  BOOKING_EXPIRED: 'error',
  BOOKING_EXPIRED_NO_SHOW: 'error',
  BOOKING_AUTO_CANCELLED_NO_ORDER: 'error',
  BOOKING_EXTENDED: 'info',
  BOOKING_UPDATED: 'info',
  BOOKING_STATUS_UPDATED: 'info',
  BOOKING_WALK_IN_CREATED: 'success',
  BOOKING_LATE_ARRIVAL_WALK_IN_CREATED: 'warning',
  BOOKING_DEPOSIT_UPDATED: 'info',
  BOOKING_DEPOSIT_PAID: 'success',
  TABLE_RESERVED: 'warning',
  TABLE_STATUS_SYNC: 'info',
  NO_ORDER_AUTO_CANCELLED: 'error',
  TABLE_OCCUPIED_CONFLICT: 'error',
  NO_ORDER_WARNING: 'warning',
  CHECKOUT_REMINDER: 'info',
  CHECKOUT_OVERDUE: 'error',
  ORDER_CREATED: 'info',
  ORDER_READY: 'success',
  ORDER_CANCELLED: 'error',
  PAYMENT_COMPLETED: 'success',
  PAYMENT_FAILED: 'error',
};

/** Tên hiển thị thân thiện cho từng event */
export const EVENT_LABEL_MAP: Record<string, string> = {
  BOOKING_CREATED: 'Đặt bàn mới',
  BOOKING_CONFIRMED: 'Xác nhận đặt bàn',
  BOOKING_CHECKED_IN: 'Check-in',
  BOOKING_CHECKED_OUT: 'Check-out',
  BOOKING_CANCELLED: 'Hủy đặt bàn',
  BOOKING_EXPIRED: 'Hết hạn',
  BOOKING_EXPIRED_NO_SHOW: 'Không đến (No-show)',
  BOOKING_AUTO_CANCELLED_NO_ORDER: 'Tự hủy - không gọi món',
  BOOKING_EXTENDED: 'Gia hạn',
  BOOKING_UPDATED: 'Cập nhật booking',
  BOOKING_STATUS_UPDATED: 'Cập nhật trạng thái',
  BOOKING_WALK_IN_CREATED: 'Khách vãng lai',
  BOOKING_LATE_ARRIVAL_WALK_IN_CREATED: 'Khách đến muộn',
  BOOKING_DEPOSIT_UPDATED: 'Cập nhật cọc',
  BOOKING_DEPOSIT_PAID: 'Đã thanh toán cọc',
  TABLE_RESERVED: 'Giữ bàn trước 30p',
  TABLE_STATUS_SYNC: 'Đồng bộ trạng thái bàn',
  NO_ORDER_AUTO_CANCELLED: 'Tự hủy - không gọi món',
  TABLE_OCCUPIED_CONFLICT: '⚠️ Bàn đang bận có booking',
  NO_ORDER_WARNING: '⚠️ Khách chưa gọi món',
  CHECKOUT_REMINDER: '🕐 Sắp đến giờ checkout',
  CHECKOUT_OVERDUE: '🔴 Quá giờ checkout',
  ORDER_CREATED: '🍽️ Order mới',
  ORDER_READY: '✅ Món sẵn sàng',
  ORDER_CANCELLED: '❌ Order bị hủy',
  PAYMENT_COMPLETED: '💰 Thanh toán thành công',
  PAYMENT_FAILED: '🔴 Thanh toán thất bại',
};
