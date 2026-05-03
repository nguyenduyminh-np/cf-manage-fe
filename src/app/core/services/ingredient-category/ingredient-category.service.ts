import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  IngredientCategorySearchRequest,
  IngredientCategoryCreateRequest,
  IngredientCategoryUpdateRequest,
  IngredientCategoryIdRequest,
  IngredientCategorySearchApiResponse,
  IngredientCategoryDetailApiResponse,
  IngredientCategoryOptionsApiResponse,
  IngredientCategoryDeleteApiResponse,
} from '../../models/ingredient-category/ingredient-category.model'; // điều chỉnh đường dẫn

@Injectable({ providedIn: 'root' })
export class IngredientCategoryService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8080/api/v1/ingredient-category';

  /**
   * Tìm kiếm danh mục nguyên liệu (phân trang, lọc, sắp xếp).
   */
  search(
    request: IngredientCategorySearchRequest,
  ): Observable<IngredientCategorySearchApiResponse> {
    return this.http.post<IngredientCategorySearchApiResponse>(`${this.baseUrl}/search`, request);
  }

  /**
   * Xuất danh sách danh mục ra file Excel.
   */
  exportExcel(request: IngredientCategorySearchRequest): Observable<Blob> {
    return this.http.post(`${this.baseUrl}/export`, request, { responseType: 'blob' });
  }

  /**
   * Tạo mới danh mục nguyên liệu.
   */
  create(
    request: IngredientCategoryCreateRequest,
  ): Observable<IngredientCategoryDetailApiResponse> {
    return this.http.post<IngredientCategoryDetailApiResponse>(`${this.baseUrl}/create`, request);
  }

  /**
   * Cập nhật danh mục nguyên liệu.
   */
  update(
    request: IngredientCategoryUpdateRequest,
  ): Observable<IngredientCategoryDetailApiResponse> {
    return this.http.post<IngredientCategoryDetailApiResponse>(`${this.baseUrl}/update`, request);
  }

  /**
   * Xóa mềm danh mục nguyên liệu (set active = false).
   * Cần truyền object { id: number }.
   */
  delete(id: number): Observable<IngredientCategoryDeleteApiResponse> {
    const body: IngredientCategoryIdRequest = { id };
    return this.http.post<IngredientCategoryDeleteApiResponse>(`${this.baseUrl}/delete`, body);
  }

  /**
   * Xem chi tiết danh mục nguyên liệu.
   */
  getDetail(id: number): Observable<IngredientCategoryDetailApiResponse> {
    const body: IngredientCategoryIdRequest = { id };
    return this.http.post<IngredientCategoryDetailApiResponse>(`${this.baseUrl}/detail`, body);
  }

  /**
   * Lấy danh sách danh mục dạng options (cho dropdown, chỉ trả về các danh mục active).
   */
  getOptions(): Observable<IngredientCategoryOptionsApiResponse> {
    return this.http.post<IngredientCategoryOptionsApiResponse>(`${this.baseUrl}/options`, {});
  }
}
