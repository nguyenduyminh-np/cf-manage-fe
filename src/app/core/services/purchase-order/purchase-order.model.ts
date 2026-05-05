import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  PurchaseOrderSearchRequest,
  PurchaseOrderCreateRequest,
  PurchaseOrderUpdateRequest,
  PurchaseOrderStatusUpdateRequest,
  PurchaseOrderSearchApiResponse,
  PurchaseOrderDetailApiResponse,
  PurchaseOrderVoidApiResponse,
} from '../../models/purchase-order/purchase-order.model'; // điều chỉnh đường dẫn thực tế

@Injectable({ providedIn: 'root' })
export class PurchaseOrderService {
  private readonly http = inject(HttpClient);

  /**
   * Tìm kiếm đơn nhập hàng (phân trang, lọc, sắp xếp).
   */
  search(request: PurchaseOrderSearchRequest): Observable<PurchaseOrderSearchApiResponse> {
    return this.http.post<PurchaseOrderSearchApiResponse>('/purchase-order/search', request);
  }

  /**
   * Xuất danh sách đơn nhập hàng ra Excel (tải file).
   */
  exportExcel(request: PurchaseOrderSearchRequest): Observable<Blob> {
    return this.http.post('/purchase-order/export', request, {
      responseType: 'blob',
    });
  }

  /**
   * Tạo mới đơn nhập hàng.
   */
  create(request: PurchaseOrderCreateRequest): Observable<PurchaseOrderDetailApiResponse> {
    return this.http.post<PurchaseOrderDetailApiResponse>('/purchase-order/create', request);
  }

  /**
   * Cập nhật đơn nhập hàng (trước khi hoàn thành/hủy).
   */
  update(request: PurchaseOrderUpdateRequest): Observable<PurchaseOrderDetailApiResponse> {
    return this.http.post<PurchaseOrderDetailApiResponse>('/purchase-order/update', request);
  }

  /**
   * Thay đổi trạng thái đơn hàng (duyệt, huỷ, hoàn thành).
   */
  updateStatus(
    request: PurchaseOrderStatusUpdateRequest,
  ): Observable<PurchaseOrderVoidApiResponse> {
    return this.http.post<PurchaseOrderVoidApiResponse>('/purchase-order/status', request);
  }

  /**
   * Xem chi tiết đơn nhập hàng.
   */
  getDetail(id: number): Observable<PurchaseOrderDetailApiResponse> {
    return this.http.post<PurchaseOrderDetailApiResponse>('/purchase-order/detail', { id });
  }
}
