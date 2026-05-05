import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  DishCategorySearchRequest,
  DishCategorySearchApiResponse,
  DishCategoryCreateRequest,
  DishCategoryUpdateRequest,
  DishCategoryDetailApiResponse,
  DishCategoryDeleteApiResponse,
  DishCategoryOptionsApiResponse,
} from '../../models/dish-category/dish-category.model';

@Injectable({ providedIn: 'root' })
export class DishCategoryService {
  private readonly http = inject(HttpClient);

  /**
   * Tìm kiếm danh mục động (phân trang, lọc, sắp xếp).
   */
  search(request: DishCategorySearchRequest): Observable<DishCategorySearchApiResponse> {
    return this.http.post<DishCategorySearchApiResponse>('/dish-category/search', request);
  }

  exportExcel(request: DishCategorySearchRequest): Observable<Blob> {
    return this.http.post('/dish-category/export', request, {
      responseType: 'blob',
    });
  }

  /**
   * Tạo mới danh mục.
   */
  create(request: DishCategoryCreateRequest): Observable<DishCategoryDetailApiResponse> {
    return this.http.post<DishCategoryDetailApiResponse>('/dish-category/create', request);
  }

  /**
   * Cập nhật danh mục.
   */
  update(request: DishCategoryUpdateRequest): Observable<DishCategoryDetailApiResponse> {
    return this.http.post<DishCategoryDetailApiResponse>('/dish-category/update', request);
  }

  /**
   * Xóa mềm danh mục (set active = false).
   */
  delete(id: number): Observable<DishCategoryDeleteApiResponse> {
    return this.http.post<DishCategoryDeleteApiResponse>('/dish-category/delete', { id });
  }

  /**
   * Lấy chi tiết một danh mục.
   */
  getDetail(id: number): Observable<DishCategoryDetailApiResponse> {
    return this.http.post<DishCategoryDetailApiResponse>('/dish-category/detail', { id });
  }

  /**
   * Lấy danh sách danh mục active để làm dropdown.
   */
  getOptions(): Observable<DishCategoryOptionsApiResponse> {
    return this.http.post<DishCategoryOptionsApiResponse>('/dish-category/options', {});
  }
}
