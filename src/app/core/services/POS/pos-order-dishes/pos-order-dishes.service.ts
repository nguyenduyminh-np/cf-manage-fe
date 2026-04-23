import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../../environments/environment';
import {
  DishOrderCreateRequest,
  DishOrderResponse,
  DishSearchRequest,
  DishSearchResponse,
} from '../../../models/pos-order-dishes/pos-order-dishes.model';
import { ApiResponse } from '../../../models/base/api-response.model';

@Injectable({ providedIn: 'root' })
export class PosOrderDishesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/dish-order`;

  searchDishes(request: DishSearchRequest): Observable<DishSearchResponse> {
    return this.http.post<DishSearchResponse>(
      `${this.baseUrl}/dishes-for-pos-order-dishes`,
      request,
    );
  }

  /**
   * Tạo đơn đặt món mới.
   * @param request Dữ liệu đơn hàng (bàn, ghi chú, danh sách món)
   * @returns Observable chứa ApiResponse<DishOrderResponse>
   */
  createDishOrder(request: DishOrderCreateRequest): Observable<ApiResponse<DishOrderResponse>> {
    return this.http.post<ApiResponse<DishOrderResponse>>(`${this.baseUrl}/create`, request);
  }
}
