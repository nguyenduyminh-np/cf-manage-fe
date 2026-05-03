// ────────── GENERIC WRAPPERS (nếu chưa có global) ──────────
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
export interface AccountSearchRequest {
  username?: string;
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  roleId?: number;
  isActive?: boolean;
  fromBirthDate?: string; // ISO‑8601
  toBirthDate?: string;
  page?: number;
  limit?: number;
  sortField?: string; // 'username', 'fullName', 'email', 'createdAt'
  sortDir?: string; // 'asc' | 'desc'
}

export interface AccountListItem {
  id: number;
  username: string;
  fullName: string;
  email: string | null;
  phoneNumber: string | null;
  photo: string | null;
  isActive: boolean;
  roleName: string;
  dateOfBirth: string; // ISO‑8601
  createdAt: string;
}

export type AccountSearchApiResponse = ApiResponse<PageResponse<AccountListItem>>;

// ────────── CREATE ──────────
export interface AccountCreateRequest {
  accountCode?: string;
  username: string;
  password: string;
  fullName: string;
  email?: string;
  photo?: string;
  dateOfBirth: string; // ISO‑8601
  phoneNumber?: string;
  roleId: number;
}

// ────────── UPDATE ──────────
export interface AccountUpdateRequest {
  id: number;
  accountCode?: string;
  username?: string;
  password?: string;
  fullName?: string;
  email?: string;
  photo?: string;
  dateOfBirth?: string;
  phoneNumber?: string;
  roleId?: number;
  isActive?: boolean;
}

// ────────── DETAIL (trả về sau create / update / detail) ──────────
export interface AccountDetail {
  id: number;
  accountCode: string | null;
  username: string;
  fullName: string;
  email: string | null;
  photo: string | null;
  dateOfBirth: string;
  phoneNumber: string | null;
  isActive: boolean;
  roleId: number;
  roleName: string;
  createdAt: string;
}

export type AccountDetailApiResponse = ApiResponse<AccountDetail>;

// ────────── DELETE ──────────
export type AccountDeleteApiResponse = ApiResponse<void>;
