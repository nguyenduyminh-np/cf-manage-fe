// ────────── RESPONSE WRAPPER ──────────
export interface DashboardApiResponse<T> {
  status: number;
  message: string;
  data: T;
}

// ────────── KPI ──────────
export interface DashboardKpi {
  revenueToday: number;
  totalOrdersToday: number;
  paidOrdersToday: number;
  occupiedTables: number;
  activeStaff: number;
  processingOrders: number;
  totalSupplierDebt: number;
  expiringSoonStock: number;
  upcomingBookings: number;
}

// ────────── CHARTS ──────────
export interface RevenueDayPoint {
  date: string;        // yyyy-MM-dd
  dailyRevenue: number;
}

export interface OrdersByHourPoint {
  hour: number;        // 0–23
  orderCount: number;
}

export interface OrderStatusDistribution {
  status: string;
  orderCount: number;
}

export interface TopDish {
  dishName: string;
  totalQuantity: number;
}

export interface TableStatusByFloor {
  floor: number;
  occupied: number;
  available: number;
}

export interface DebtBySupplier {
  supplierName: string;
  debtAmount: number;
}

// ────────── QUICK TABLES ──────────
export interface ProcessingOrder {
  orderId: number;
  tableName: string;
  createdAt: string;      // ISO 8601 UTC
  itemsSummary: string;
}

export interface UpcomingBooking {
  expectedArriveTime: string; // ISO 8601 UTC
  customerName: string;
  phoneNumber: string;
  tableName: string;
  note: string | null;
}

export interface StockAlert {
  ingredientName: string;
  batchId: number;
  quantity: number;
  expirationAt: string;    // ISO 8601 UTC
  warehouseName: string;
}

export interface PendingInvoice {
  invoiceCode: string;
  tableName: string;
  totalAmount: number;
  createdAt: string;       // ISO 8601 UTC
  customerName: string | null;
}

export interface DraftPurchaseOrder {
  purchaseOrderCode: string;
  totalAmount: number | null;
  createdAt: string;       // ISO 8601 UTC
  supplierName: string;
}
