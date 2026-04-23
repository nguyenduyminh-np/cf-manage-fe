export interface OrderHistoryItem {
  dishOrderId: number; // ✅ thêm
  tableName: string;
  employeeName: string;

  orderStatus: string; // label hiển thị
  dishOrderStatusCode: 'PROCESSING' | 'DONE' | 'PAID' | 'CANCEL'; // ✅ thêm

  createdAt: string;
  note: string | null;
  totalQuantity: number;
  totalAmount: number;
}

export interface OrderHistorySearchRequest {
  diningTableId?: number;
  tableName?: string;
  employeeName?: string;
  status?: string;
  page: number;
  limit: number;
  sortField?: string;
  sortDir?: 'asc' | 'desc';
}

export interface OrderHistorySearchResponse {
  status: number;
  message: string;
  data: {
    rows: OrderHistoryItem[];
    pageNo: number;
    pageSize: number;
    totalElements: number;
    totalPages: number;
  };
}

export interface BulkUpdateStatusRequest {
  dishOrderIds: number[];
  dishOrderStatus: string;
}

export interface BulkUpdateStatusResponse {
  successIds: number[];
  failedIds?: number[];
  message?: string;
}
