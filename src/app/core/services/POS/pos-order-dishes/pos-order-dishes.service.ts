import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import {
  DishOrderCreateRequest,
  DishOrderResponse,
  DishSearchRequest,
  DishSearchResponse,
  DishListRequest,
  DishListApiResponse,
} from '../../../models/pos-order-dishes/pos-order-dishes.model';
import { ApiResponse } from '../../../models/base/api-response.model';

@Injectable({ providedIn: 'root' })
export class PosOrderDishesService {
  private readonly http = inject(HttpClient);

  searchDishes(request: DishSearchRequest): Observable<DishSearchResponse> {
    return this.http.post<DishSearchResponse>('/dish-order/dishes-for-pos-order-dishes', request);
  }

  /**
   * Lấy toàn bộ món theo danh mục và trạng thái active.
   * Sử dụng cho tab lọc danh mục trong POS Order Dishes.
   */
  listDishes(request: DishListRequest): Observable<DishListApiResponse> {
    return this.http.post<DishListApiResponse>('/dish/list', request);
  }

  /**
   * Tạo đơn đặt món mới.
   * @param request Dữ liệu đơn hàng (bàn, ghi chú, danh sách món)
   * @returns Observable chứa ApiResponse<DishOrderResponse>
   */
  createDishOrder(request: DishOrderCreateRequest): Observable<ApiResponse<DishOrderResponse>> {
    return this.http.post<ApiResponse<DishOrderResponse>>('/dish-order/create', request);
  }
}
