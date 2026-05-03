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
export interface SupplierSearchRequest {
  supplierCode?: string;
  supplierName?: string;
  contactInfo?: string;
  address?: string;
  active?: boolean;
  page: number;
  limit: number;
  sortField?: string; // 'createdTime', 'supplierName', ...
  sortDir?: string; // 'asc' | 'desc'
}

export interface SupplierListItem {
  id: number;
  supplierCode: string | null;
  supplierName: string;
  contactInfo: string;
  address: string | null;
  createdTime: string; // ISO-8601
  active: boolean;
}

export type SupplierSearchApiResponse = ApiResponse<PageResponse<SupplierListItem>>;

// ────────── CREATE ──────────
export interface SupplierCreateRequest {
  supplierCode?: string;
  supplierName: string;
  contactInfo: string;
  address?: string;
}

// ────────── UPDATE ──────────
export interface SupplierUpdateRequest {
  id: number;
  supplierCode?: string;
  supplierName?: string;
  contactInfo?: string;
  address?: string;
  active?: boolean;
}

// ────────── DETAIL (dùng cho create/update/detail) ──────────
export interface SupplierDetail {
  id: number;
  supplierCode: string | null;
  supplierName: string;
  contactInfo: string;
  address: string | null;
  createdTime: string;
  active: boolean;
}

export type SupplierDetailApiResponse = ApiResponse<SupplierDetail>;

// ────────── OPTIONS (dropdown) ──────────
export interface SupplierOption {
  id: number;
  supplierCode: string | null;
  supplierName: string;
}

export type SupplierOptionsApiResponse = ApiResponse<SupplierOption[]>;

// ────────── DELETE ──────────
export type SupplierDeleteApiResponse = ApiResponse<void>;
