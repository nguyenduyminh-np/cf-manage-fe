// ────────── REQUEST ──────────
export interface DishSearchRequest {
  dishCode?: string;
  dishName?: string;
  priceFrom?: number;
  priceTo?: number;
  dishCategoryId?: number;
  fromDate?: string;       // ISO-8601
  toDate?: string;
  isActive?: boolean;
  page: number;
  limit: number;
  sortField?: string;      // 'createdTime', 'dishName', 'price', ...
  sortDir?: string;        // 'asc' | 'desc'
}

export interface DishCreateRequest {
  dishCode?: string;
  dishName: string;
  price: number;
  photo: string;           // đường dẫn ảnh (tương đối)
  dishCategoryId: number;
}

export interface DishUpdateRequest {
  id: number;
  dishCode?: string;
  dishName?: string;
  price?: number;
  photo?: string;
  dishCategoryId?: number;
  active?: boolean;
}

// ────────── LIST ITEM (row trong bảng search) ──────────
export interface DishListItem {
  id: number;
  dishCode: string | null;
  dishName: string;
  price: number;
  photo: string;
  createdTime: string;       // ISO-8601
  active: boolean;
  dishCategoryId: number;
  dishCategoryName?: string; // nếu backend trả về (tuỳ mapper)
}

// ────────── DETAIL (trả về khi create/update/detail) ──────────
export interface DishDetail {
  id: number;
  dishCode: string | null;
  dishName: string;
  price: number;
  photo: string;
  createdTime: string;
  active: boolean;
  dishCategoryId: number;
  dishCategoryName: string;  // bắt buộc có trong detail
}

// ────────── GENERIC PAGE WRAPPER ──────────
export interface PageResponse<T> {
  rows: T[];
  pageNo: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
}

// ────────── API RESPONSE WRAPPERS ──────────
export interface DishSearchApiResponse {
  status: number;
  message: string;
  data: PageResponse<DishListItem>;
}

export interface DishListApiResponse {
  status: number;
  message: string;
  data: DishListItem[];
}

export interface DishDetailApiResponse {
  status: number;
  message: string;
  data: DishDetail;
}

export interface DishDeleteApiResponse {
  status: number;
  message: string;
}