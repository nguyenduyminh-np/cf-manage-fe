// pos-order-dishes.model.ts

/** Tương ứng với DishResponseDTO bên backend */
export interface DishItem {
  dishId: number;
  dishCode: string | null;
  dishName: string;
  price: number;
  photo: string | null;
  dishCategoryId: number;
  dishCategoryCode: string | null;
  dishCategoryName: string;
  active: boolean;
  createdTime: string; // ISO-8601
}

/** Request cho API POST /dish/list */
export interface DishListRequest {
  active?: boolean;
  dishCategoryId?: number;
}

/** Response của API POST /dish/list */
export interface DishListApiResponse {
  status: number;
  message: string;
  data: DishItem[];
}

export interface DishSearchRequest {
  searchString?: string;
  dishCategoryId?: number;
  page?: number;
  limit?: number;
}

export interface DishSearchResponse {
  status: number;
  message: string;
  data: {
    rows: DishItem[];
    pageNo: number;
    pageSize: number;
    totalElements: number;
    totalPages: number;
  };
}


export interface DishOrderDetailPayload {
  dishId: number;
  quantity: number;
  note?: string;
}

/** Request body cho API tạo đơn đặt món */
export interface DishOrderCreateRequest {
  tableId: number;
  description?: string;
  dishOrderDetails: DishOrderDetailPayload[];
}

/** Chi tiết món trong response */
export interface DishOrderDetailResponse {
  dishOrderDetailId: number;
  dishOrderId: number;
  dishId: number;
  dishName: string;
  photo?: string | null;
  quantity: number;
  note: string | null;
  unitPrice: number;      // Đơn giá gốc tại thời điểm gọi
  totalPrice: number;     // Thành tiền dòng = quantity * unitPrice (snapshot)
}

/** Response body của API tạo đơn đặt món */
export interface DishOrderResponse {
  dishOrderId: number;
  tableId: number;
  accountId: number;
  accountName: string;
  note: string | null;
  totalBill: number;                 // Tổng tiền đơn hàng
  dishOrderStatusId: number;
  dishOrderStatusName: string;       // VD: "Đang chế biến"
  createdTime: string;               // ISO 8601
  dishOrderDetails: DishOrderDetailResponse[];
}
