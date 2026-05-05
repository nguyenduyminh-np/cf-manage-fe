import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  WarehouseSearchRequest,
  WarehouseCreateRequest,
  WarehouseUpdateRequest,
  WarehouseSearchApiResponse,
  WarehouseDetailApiResponse,
  WarehouseOptionsApiResponse,
  WarehouseDeleteApiResponse,
} from '../../models/warehouse/warehouse.model'; // điều chỉnh đường dẫn

@Injectable({ providedIn: 'root' })
export class WarehouseService {
  private readonly http = inject(HttpClient);

  /**
   * Tìm kiếm nhà kho (phân trang, lọc, sắp xếp).
   */
  search(request: WarehouseSearchRequest): Observable<WarehouseSearchApiResponse> {
    return this.http.post<WarehouseSearchApiResponse>('/warehouse/search', request);
  }

  /**
   * Xuất danh sách nhà kho ra file Excel.
   * Request giống search, không cần page/limit.
   */
  exportExcel(request: WarehouseSearchRequest): Observable<Blob> {
    return this.http.post('/warehouse/export', request, { responseType: 'blob' });
  }

  /**
   * Tạo mới nhà kho.
   */
  create(request: WarehouseCreateRequest): Observable<WarehouseDetailApiResponse> {
    return this.http.post<WarehouseDetailApiResponse>('/warehouse/create', request);
  }

  /**
   * Cập nhật nhà kho.
   */
  update(request: WarehouseUpdateRequest): Observable<WarehouseDetailApiResponse> {
    return this.http.post<WarehouseDetailApiResponse>('/warehouse/update', request);
  }

  /**
   * Xóa mềm nhà kho (set active = false).
   * Yêu cầu không có tồn kho hoặc giao dịch đang xử lý.
   */
  delete(id: number): Observable<WarehouseDeleteApiResponse> {
    return this.http.post<WarehouseDeleteApiResponse>('/warehouse/delete', { id });
  }

  /**
   * Xem chi tiết nhà kho.
   */
  getDetail(id: number): Observable<WarehouseDetailApiResponse> {
    return this.http.post<WarehouseDetailApiResponse>('/warehouse/detail', { id });
  }

  /**
   * Lấy danh sách nhà kho dạng options (cho dropdown, chỉ trả về active).
   */
  getOptions(): Observable<WarehouseOptionsApiResponse> {
    return this.http.post<WarehouseOptionsApiResponse>('/warehouse/options', {});
  }
}
