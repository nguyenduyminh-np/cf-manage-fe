import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  BulkUpdateStatusRequest,
  BulkUpdateStatusResponse,
  OrderHistorySearchRequest,
  OrderHistorySearchResponse,
} from '../../models/order-dishes/order-dishes.model';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class OrderDishesHistoryService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8080/api/v1/dish-order';

  search(request: OrderHistorySearchRequest): Observable<OrderHistorySearchResponse> {
    return this.http.post<OrderHistorySearchResponse>(`${this.baseUrl}/order-history`, request);
  }

  // service
  updateStatusBulk(body: BulkUpdateStatusRequest): Observable<BulkUpdateStatusResponse> {
    return this.http.post<BulkUpdateStatusResponse>(`${this.baseUrl}/update-status`, body);
  }
}
