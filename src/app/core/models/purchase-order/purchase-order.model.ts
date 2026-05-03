// ────────── GENERIC API WRAPPERS ──────────
export interface ApiResponse<T> {
  status: number;
  message: string;
  data: T;
}

export interface PageResponse<T> {
  rows: T[];
  pageNo: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
}

// ────────── SEARCH ──────────
export interface PurchaseOrderSearchRequest {
  purchaseOrderCode?: string;
  paymentStatus?: string; // DRAFT, PENDING, APPROVED, COMPLETED, CANCELLED
  totalPriceFrom?: number;
  totalPriceTo?: number;
  fromDate?: string; // ISO-8601
  toDate?: string;
  page: number;
  limit: number;
  sortField?: string; // 'createdTime', 'totalPrice', 'paymentStatus'
  sortDir?: string; // 'asc' | 'desc'
}

export interface PurchaseOrderListItem {
  id: number;
  purchaseOrderCode: string | null;
  totalPrice: number;
  paymentStatus: string;
  accountFullName: string;
  supplierName: string | null;
  createdTime: string;
  orderDate: string | null;
}

export type PurchaseOrderSearchApiResponse = ApiResponse<PageResponse<PurchaseOrderListItem>>;

// ────────── CREATE ──────────
export interface PurchaseOrderDetailItem {
  ingredientId: number;
  quantity: number;
  unitPrice: number;
}

export interface PurchaseOrderCreateRequest {
  purchaseOrderCode?: string; // null để tự sinh
  totalPrice: number;
  paymentStatus: string; // DRAFT, PENDING, APPROVED (tuỳ role)
  orderDate?: string;
  supplierId: number;
  warehouseId: number;
  details: PurchaseOrderDetailItem[];
}

// ────────── UPDATE ──────────
export interface PurchaseOrderUpdateDetail extends PurchaseOrderDetailItem {
  id?: number | null; // null -> thêm mới, có id -> cập nhật
}

export interface PurchaseOrderUpdateRequest {
  id: number;
  totalPrice?: number;
  paymentStatus?: string;
  orderDate?: string;
  supplierId?: number;
  warehouseId?: number;
  details?: PurchaseOrderUpdateDetail[];
}

// ────────── STATUS UPDATE ──────────
export interface PurchaseOrderStatusUpdateRequest {
  id: number;
  newStatus: string; // PENDING, APPROVED, COMPLETED, CANCELLED
  warehouseId?: number; // bắt buộc khi COMPLETED
}

// ────────── DETAIL (response chung cho create, update, detail) ──────────
export interface PurchaseOrderDetailItemResponse {
  id: number;
  ingredientId: number;
  ingredientName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface PurchaseOrderDetail {
  id: number;
  purchaseOrderCode: string | null;
  totalPrice: number;
  paymentStatus: string;
  accountFullName: string;
  supplierName: string | null;
  warehouseName: string | null;
  createdTime: string;
  orderDate: string | null;
  details: PurchaseOrderDetailItemResponse[];
}

export type PurchaseOrderDetailApiResponse = ApiResponse<PurchaseOrderDetail>;

// ────────── DELETE / STATUS generic void response (dùng cho updateStatus) ──────────
export type PurchaseOrderVoidApiResponse = ApiResponse<void>;
