import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  IngredientSearchRequest,
  IngredientCreateRequest,
  IngredientUpdateRequest,
  IngredientSearchApiResponse,
  IngredientDetailApiResponse,
  IngredientDeleteApiResponse,
} from '../../models/ingredient/ingredient.model'; // điều chỉnh đường dẫn thực tế

@Injectable({ providedIn: 'root' })
export class IngredientService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8080/api/v1/ingredient';

  /**
   * Tìm kiếm nguyên liệu (phân trang, lọc, sắp xếp).
   */
  search(request: IngredientSearchRequest): Observable<IngredientSearchApiResponse> {
    return this.http.post<IngredientSearchApiResponse>(`${this.baseUrl}/search`, request);
  }

  /**
   * Xuất danh sách nguyên liệu ra Excel (tải file).
   * Request giống search nhưng không cần page/limit.
   */
  exportExcel(request: IngredientSearchRequest): Observable<Blob> {
    return this.http.post(`${this.baseUrl}/export`, request, {
      responseType: 'blob',
    });
  }

  /**
   * Tạo mới nguyên liệu.
   */
  create(request: IngredientCreateRequest): Observable<IngredientDetailApiResponse> {
    return this.http.post<IngredientDetailApiResponse>(`${this.baseUrl}/create`, request);
  }

  /**
   * Cập nhật nguyên liệu.
   */
  update(request: IngredientUpdateRequest): Observable<IngredientDetailApiResponse> {
    return this.http.post<IngredientDetailApiResponse>(`${this.baseUrl}/update`, request);
  }

  /**
   * Xóa mềm nguyên liệu (set active = false).
   */
  delete(id: number): Observable<IngredientDeleteApiResponse> {
    return this.http.post<IngredientDeleteApiResponse>(`${this.baseUrl}/delete`, { id });
  }

  /**
   * Xem chi tiết nguyên liệu (kèm danh sách lô tồn kho).
   */
  getDetail(id: number): Observable<IngredientDetailApiResponse> {
    return this.http.post<IngredientDetailApiResponse>(`${this.baseUrl}/detail`, { id });
  }
}
