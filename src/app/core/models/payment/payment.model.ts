// ────────────────────────────── REQUEST ──────────────────────────────

export interface PaymentPreviewRequest {
  orderId: number;
}

export interface PaymentRequest {
  orderId: number;
  paymentMethod: string; // "CASH" | "BANK_TRANSFER"
}

// ────────────────────────────── RESPONSE DATA ──────────────────────────────

export interface PaymentPreviewData {
  orderId: number;
  orderCreatedAt: string;
  diningTable: DiningTableInfo;
  createdBy: AccountInfo;
  customer: CustomerInfo | null;
  items: OrderItem[];
  totalAmount: number;
  suggestedPaymentMethods: string[];
}

export interface PaymentData {
  invoice: InvoiceInfo;
  invoiceDetails: InvoiceDetailInfo[];
  cashFlow: CashFlowInfo;
}

// ────────────────────────────── CÁC OBJECT CON ──────────────────────────────

export interface DiningTableInfo {
  id: number;
  tableCode: string;
  tableName: string;
  floor: number;
  slot: number;
  status: string;
}

export interface AccountInfo {
  accountId: number;
  username: string;
  fullName: string;
}

export interface CustomerInfo {
  bookingId?: number;
  customerName: string;
  phoneNumber?: string;
}

export interface OrderItem {
  dishId: number;
  dishCode: string;
  dishName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface InvoiceInfo {
  id: number;
  invoiceCode: string;
  totalAmount: number;
  paymentStatus: string;
  paymentMethod: string;
  createdAt: string;
  diningTableId: number;
  dishOrderId: number;
  accountId: number;
  bookingId: number | null;
  customerName: string;
  customerPhone: string | null;
}

export interface InvoiceDetailInfo {
  id: number;
  dishId: number;
  dishName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface CashFlowInfo {
  id: number;
  totalAmount: number;
  flowType: string;
  note: string;
  createdAt: string;
}

// ────────────────────────────── API RESPONSE WRAPPER ──────────────────────────────
// Giống hệt cấu trúc ApiResponse từ backend

export interface PaymentPreviewApiResponse {
  status: number;
  message: string;
  data: PaymentPreviewData;
}

export interface PaymentApiResponse {
  status: number;
  message: string;
  data: PaymentData;
}