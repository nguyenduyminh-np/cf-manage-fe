// ────────── Generic API Wrappers (có thể dùng chung toàn app) ──────────
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

// ────────── Search Request ──────────
export interface WarehouseSearchRequest {
  searchString?: string; // tìm theo mã hoặc tên
  active?: boolean; // null -> tất cả, true/false -> lọc
  sortField?: string; // id, warehouseCode, warehouseName, location, createdTime, ingredientCount
  sortDir?: string; // 'ASC' | 'DESC'
  page: number;
  limit: number;
}

// ────────── List Item (trả về trong page.rows) ──────────
export interface WarehouseListItem {
  id: number;
  warehouseCode: string | null;
  warehouseName: string;
  location: string | null;
  note: string | null;
  createdTime: string; // ISO-8601
  active: boolean;
  ingredientCount: number; // số loại nguyên liệu đang có trong kho
}

export type WarehouseSearchApiResponse = ApiResponse<PageResponse<WarehouseListItem>>;

// ────────── Create Request ──────────
export interface WarehouseCreateRequest {
  warehouseCode?: string;
  warehouseName: string;
  location?: string;
  note?: string;
}

// ────────── Update Request ──────────
export interface WarehouseUpdateRequest {
  id: number;
  warehouseCode?: string;
  warehouseName?: string;
  location?: string;
  note?: string;
  active?: boolean;
}

// ────────── Detail Response (dùng cho create / update / detail) ──────────
export interface WarehouseDetail {
  id: number;
  warehouseCode: string | null;
  warehouseName: string;
  location: string | null;
  note: string | null;
  createdTime: string;
  active: boolean;
}

export type WarehouseDetailApiResponse = ApiResponse<WarehouseDetail>;

// ────────── Delete / Detail Request (body chứa id) ──────────
export interface WarehouseIdRequest {
  id: number;
}

// ────────── Options (dropdown) ──────────
export interface WarehouseOption {
  id: number;
  warehouseCode: string | null;
  warehouseName: string;
}

export type WarehouseOptionsApiResponse = ApiResponse<WarehouseOption[]>;

// ────────── Delete Response ──────────
export type WarehouseDeleteApiResponse = ApiResponse<void>;
