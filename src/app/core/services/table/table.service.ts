import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../models/base/api-response.model';
import { TableDetailRequest } from '../../models/table-detail/table-detail-request.model';
import { TableDetailResponse } from '../../models/table-detail/table-detail-response.model';
import { TableSearchRequest } from '../../models/table/table-search-request.model';
import { TableSearchResponse } from '../../models/table/table-search-response.model';
import {
  TableAvailableResponseDTO,
  TableAvailableSearchRequestDTO,
} from '../../models/table/table.model';

@Injectable({
  providedIn: 'root',
})
export class TableService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/table`;

  search(request: TableSearchRequest): Observable<TableSearchResponse> {
    const normalizedRequest = this.normalizeSearchRequest(request);

    return this.http.post<TableSearchResponse>(`${this.baseUrl}/search`, normalizedRequest);
  }

  exportExcel(request: TableSearchRequest): Observable<Blob> {
    const normalizedRequest = this.normalizeSearchRequest(request);

    return this.http.post(`${this.baseUrl}/grid/export`, normalizedRequest, {
      responseType: 'blob',
    });
  }

  detail(request: TableDetailRequest): Observable<TableDetailResponse> {
    return this.http.post<TableDetailResponse>(`${this.baseUrl}/detail`, request);
  }

  getAvailableTables(
    request?: TableAvailableSearchRequestDTO | null,
  ): Observable<ApiResponse<TableAvailableResponseDTO[]>> {
    const normalizedRequest = this.normalizeAvailableTableRequest(request);

    return this.http
      .post<
        ApiResponse<TableAvailableResponseDTO[]>
      >(`${this.baseUrl}/available`, normalizedRequest)
      .pipe(
        map((response) => ({
          ...response,
          data: response.data ?? [],
        })),
      );
  }

  private normalizeAvailableTableRequest(
    request?: TableAvailableSearchRequestDTO | null,
  ): TableAvailableSearchRequestDTO | null {
    if (!request) {
      return null;
    }

    const normalizedRequest: TableAvailableSearchRequestDTO = {};
    const tableName = request.table_name?.trim();

    if (tableName) {
      normalizedRequest.table_name = tableName;
    }

    if (typeof request.floor === 'number' && Number.isFinite(request.floor)) {
      normalizedRequest.floor = request.floor;
    }

    const seatValue =
      typeof request.seat === 'number' && Number.isFinite(request.seat)
        ? request.seat
        : typeof request.slot === 'number' && Number.isFinite(request.slot)
          ? request.slot
          : null;

    if (seatValue !== null) {
      normalizedRequest.seat = seatValue;
    }

    return Object.keys(normalizedRequest).length > 0 ? normalizedRequest : null;
  }

  private normalizeSearchRequest(request: TableSearchRequest): TableSearchRequest {
    const incomingSortField = request.sortField;
    const shouldUseDefaultSort = !incomingSortField || incomingSortField === 'lastBookingTime';

    return {
      ...request,
      sortField: shouldUseDefaultSort ? '' : incomingSortField,
      sortDir: shouldUseDefaultSort ? 'ASC' : request.sortDir === 'DESC' ? 'DESC' : 'ASC',
    };
  }
}
