// ────────── GENERIC API WRAPPERS (nếu chưa có global) ──────────
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
export interface IngredientSearchRequest {
  searchString?: string;
  ingredientCategoryId?: number;
  supplierId?: number;
  active?: boolean;
  sortField?: string; // 'ingredientName', 'averagePrice', 'createdTime', ...
  sortDir?: string; // 'ASC' | 'DESC'
  page: number;
  limit: number;
}

export interface IngredientListItem {
  id: number;
  ingredientCode: string | null;
  ingredientName: string;
  selfLife: number;
  averagePrice: number;
  createdTime: string; // ISO-8601
  active: boolean;
  ingredientCategoryId: number;
  ingredientCategoryName: string;
  supplierId: number;
  supplierName: string;
  unitId: number;
  unitName: string;
  currentStock: number; // tổng tồn khả dụng
}

export type IngredientSearchApiResponse = ApiResponse<PageResponse<IngredientListItem>>;

// ────────── EXPORT ──────────
// Export sử dụng cùng request như search (không cần page/limit), response là Blob (file Excel)
// Không cần định nghĩa response type riêng, service sẽ trả về Observable<Blob>

// ────────── DETAIL ──────────
export interface StockLevelDTO {
  id: number;
  warehouseName: string;
  quantity: number;
  expirationDate: string; // ISO-8601
  unitPrice: number;
}

export interface IngredientDetail {
  id: number;
  ingredientCode: string | null;
  ingredientName: string;
  selfLife: number;
  averagePrice: number;
  createdTime: string;
  active: boolean;

  ingredientCategoryId: number;
  ingredientCategoryCode: string | null;
  ingredientCategoryName: string;

  supplierId: number;
  supplierCode: string | null;
  supplierName: string;

  unitId: number;
  unitCode: string | null;
  unitName: string;

  stockLevels: StockLevelDTO[];
}

export type IngredientDetailApiResponse = ApiResponse<IngredientDetail>;

// ────────── CREATE REQUEST (sử dụng *Code thay vì *Id) ──────────
export interface IngredientCreateRequest {
  ingredientCode?: string;
  ingredientName: string;
  selfLife: number; // >= 1
  averagePrice: number; // >= 0
  ingredientCategoryCode: string;
  supplierCode: string;
  unitCode: string;
}

// ────────── UPDATE REQUEST (sử dụng *Code thay vì *Id) ──────────
export interface IngredientUpdateRequest {
  id: number;
  ingredientCode?: string;
  ingredientName?: string;
  selfLife?: number;
  averagePrice?: number;
  ingredientCategoryCode?: string;
  supplierCode?: string;
  unitCode?: string;
  active?: boolean;
}

// ────────── DELETE ──────────
export type IngredientDeleteApiResponse = ApiResponse<void>;
