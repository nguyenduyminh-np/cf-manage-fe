import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  VoucherCreateRequest,
  VoucherListApiResponse,
  VoucherDetailApiResponse,
  VoucherCreateApiResponse,
  VoucherDeactivateApiResponse,
  VoucherPreviewApiResponse,
} from '../../models/voucher/voucher.model';

@Injectable({ providedIn: 'root' })
export class VoucherService {
  private readonly http = inject(HttpClient);

  /**
   * Lấy toàn bộ danh sách voucher (kể cả đã deactivate).
   */
  list(): Observable<VoucherListApiResponse> {
    return this.http.post<VoucherListApiResponse>('/voucher/list', null);
  }

  /**
   * Lấy chi tiết một voucher theo id.
   */
  detail(id: number): Observable<VoucherDetailApiResponse> {
    const params = new HttpParams().set('id', id);
    return this.http.post<VoucherDetailApiResponse>('/voucher/detail', null, { params });
  }

  /**
   * Tạo mới voucher.
   */
  create(request: VoucherCreateRequest): Observable<VoucherCreateApiResponse> {
    return this.http.post<VoucherCreateApiResponse>('/voucher/create', request);
  }

  /**
   * Vô hiệu hóa voucher (soft delete).
   */
  deactivate(id: number): Observable<VoucherDeactivateApiResponse> {
    const params = new HttpParams().set('id', id);
    return this.http.post<VoucherDeactivateApiResponse>('/voucher/deactivate', null, { params });
  }

  /**
   * Preview giảm giá từ trang Admin (không cần orderId).
   */
  previewDiscount(code: string, totalAmount: number): Observable<VoucherPreviewApiResponse> {
    const params = new HttpParams().set('code', code).set('totalAmount', totalAmount);
    return this.http.post<VoucherPreviewApiResponse>('/voucher/preview', null, { params });
  }
}
