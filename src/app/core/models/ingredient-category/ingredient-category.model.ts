// ────────── Generic API Wrappers (nếu chưa có global) ──────────
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
export interface IngredientCategorySearchRequest {
  searchString?: string;
  active?: boolean;
  parentCategoryId?: number;
  sortField?: string; // 'id','ingredientCategoryCode','ingredientCategoryName','createdTime','active','parentCategoryName','ingredientCount'
  sortDir?: string; // 'ASC' | 'DESC'
  page: number;
  limit: number;
}

// ────────── List Item (trả về trong page.rows) ──────────
export interface IngredientCategoryListItem {
  id: number;
  ingredientCategoryCode: string | null;
  ingredientCategoryName: string;
  createdTime: string; // ISO-8601
  active: boolean;
  parentCategoryId: number | null;
  parentCategoryName: string | null;
  ingredientCount: number; // số lượng nguyên liệu thuộc danh mục này
}

export type IngredientCategorySearchApiResponse = ApiResponse<
  PageResponse<IngredientCategoryListItem>
>;

// ────────── Create Request ──────────
export interface IngredientCategoryCreateRequest {
  ingredientCategoryCode?: string;
  ingredientCategoryName: string;
  parentCategoryId?: number;
}

// ────────── Update Request ──────────
export interface IngredientCategoryUpdateRequest {
  id: number;
  ingredientCategoryCode?: string;
  ingredientCategoryName?: string;
  parentCategoryId?: number;
  active?: boolean;
}

// ────────── Detail Response (dùng cho create / update / detail) ──────────
export interface IngredientCategoryDetail {
  id: number;
  ingredientCategoryCode: string | null;
  ingredientCategoryName: string;
  createdTime: string;
  active: boolean;
  parentCategoryId: number | null;
  parentCategoryName: string | null;
}

export type IngredientCategoryDetailApiResponse = ApiResponse<IngredientCategoryDetail>;

// ────────── Delete / Detail Request (body chứa id) ──────────
export interface IngredientCategoryIdRequest {
  id: number;
}

// ────────── Options (dropdown) ──────────
export interface IngredientCategoryOption {
  id: number;
  ingredientCategoryCode: string | null;
  ingredientCategoryName: string;
  parentCategoryId: number | null;
  parentCategoryName: string | null;
}

export type IngredientCategoryOptionsApiResponse = ApiResponse<IngredientCategoryOption[]>;

// ────────── Delete Response ──────────
export type IngredientCategoryDeleteApiResponse = ApiResponse<void>;
