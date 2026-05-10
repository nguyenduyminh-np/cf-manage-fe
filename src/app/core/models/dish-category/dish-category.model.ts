// ────────── REQUEST ──────────
export interface DishCategorySearchRequest {
  dishCategoryCode?: string;
  dishCategoryName?: string;
  fromDate?: string;       // ISO-8601 (Instant)
  toDate?: string;
  isActive?: boolean;
  page: number;
  limit: number;
  sortField?: string;      // 'createdTime', 'dishCategoryName', ...
  sortDir?: string;        // 'asc' | 'desc'
}

export interface DishCategoryCreateRequest {
  dishCategoryCode?: string;
  dishCategoryName: string;
}

export interface DishCategoryUpdateRequest {
  id: number;
  dishCategoryCode?: string;
  dishCategoryName?: string;
  active?: boolean;
}

// ────────── LIST ITEM (row trong bảng search) ──────────
export interface DishCategoryListItem {
  id: number;
  dishCategoryCode: string | null;
  dishCategoryName: string;
  createdTime: string;       // ISO-8601
  active: boolean;
}

// ────────── DETAIL ──────────
export interface DishCategoryDetail {
  id: number;
  dishCategoryCode: string | null;
  dishCategoryName: string;
  createdTime: string;
  active: boolean;
  dishCount: number;         // số món đang active trong danh mục
}

// ────────── GENERIC PAGE WRAPPER (giống backend PageResponse) ──────────
export interface PageResponse<T> {
  rows: T[];
  pageNo: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
}

// ────────── RESPONSE WRAPPERS ──────────
export interface DishCategorySearchApiResponse {
  status: number;
  message: string;
  data: PageResponse<DishCategoryListItem>;
}

export interface DishCategoryDetailApiResponse {
  status: number;
  message: string;
  data: DishCategoryDetail;
}

// Dùng chung cho delete (data null)
export interface DishCategoryDeleteApiResponse {
  status: number;
  message: string;
}

export interface DishCategoryOption {
  id: number;
  dishCategoryCode: string | null;
  dishCategoryName: string;
}

export interface DishCategoryOptionsApiResponse {
  status: number;
  message: string;
  data: DishCategoryOption[];
}

// ────────── LIST API (/dish-category/list) ──────────
/** Tương ứng với DishCategoryListRequestDTO bên backend */
export interface DishCategoryListRequest {
  /** Lọc theo trạng thái active. Mặc định true (chỉ lấy danh mục đang hoạt động) */
  active?: boolean;
}

/** Tương ứng với DishCategoryResponseDTO bên backend */
export interface DishCategoryResponseDTO {
  dishCategoryId: number;
  dishCategoryCode: string | null;
  dishCategoryName: string;
  active: boolean;
  createdTime: string; // ISO-8601 Instant
}

export interface DishCategoryListApiResponse {
  status: number;
  message: string;
  data: DishCategoryResponseDTO[];
}