// ────────── REQUEST ──────────

export interface VoucherCreateRequest {
  code: string;
  description?: string;
  discountType: 'PERCENT' | 'FIXED';
  discountValue: number;
  minOrderAmount?: number | null;
  maxDiscount?: number | null;
  usageLimit?: number | null;
  startDate?: string | null; // ISO 8601
  endDate?: string | null;   // ISO 8601
}

// ────────── RESPONSE ──────────

export interface VoucherListItem {
  id: number;
  code: string;
  description: string | null;
  discountType: 'PERCENT' | 'FIXED';
  discountValue: number;
  minOrderAmount: number | null;
  maxDiscount: number | null;
  usageLimit: number | null;
  usedCount: number;
  startDate: string | null;
  endDate: string | null;
  active: boolean;
  createdBy: number | null;
  createdAt: string;
}

// ────────── PREVIEW (Admin side) ──────────

export interface VoucherPreviewResult {
  voucherCode: string;
  discountType: 'PERCENT' | 'FIXED';
  discountValue: number;
  discountAmount: number;
  totalAmount: number;
  finalAmount: number;
}

// ────────── API RESPONSE WRAPPERS ──────────

export interface VoucherListApiResponse {
  code: number;
  message: string;
  data: VoucherListItem[];
}

export interface VoucherDetailApiResponse {
  code: number;
  message: string;
  data: VoucherListItem;
}

export interface VoucherCreateApiResponse {
  code: number;
  message: string;
  data: VoucherListItem;
}

export interface VoucherDeactivateApiResponse {
  code: number;
  message: string;
  data: boolean;
}

export interface VoucherPreviewApiResponse {
  code: number;
  message: string;
  data: VoucherPreviewResult;
}
