import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';

import {
  TableBookingCheckInRequest,
  TableBookingCheckInResponse,
  TableBookingCheckOutData,
  TableBookingCheckOutRequest,
  TableBookingCheckOutResponse,
  TableBookingDetailData,
  TableBookingDetailRequest,
  TableBookingDetailResponse,
  TableBookingCreateRequest,
  TableBookingCreateResponse,
  TableBookingResponse,
  TableBookingSearchRequest,
  TableBookingSearchResponse,
  TableBookingSortDir,
  TableBookingSortField,
  TableBookingUpdateRequest,
  TableBookingUpdateResponse,
  TableBookingUpdateStatusRequest,
  TableBookingUpdateStatusResponse,
  DeleteTableBookingRequest,
  DeleteTableBookingResponse,
} from '../../models/table-booking/table-booking.model';

const DEFAULT_SORT_FIELD: TableBookingSortField = 'expectedArriveTime';
const DEFAULT_SEARCH_SORT_FIELD: TableBookingSortField = 'checkInAt';
const DEFAULT_SORT_DIR: TableBookingSortDir = 'desc';

@Injectable({ providedIn: 'root' })
export class TableBookingService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8080/api/v1/table-booking';

  delete(request: DeleteTableBookingRequest): Observable<DeleteTableBookingResponse> {
    return this.http.post<DeleteTableBookingResponse>(`${this.baseUrl}/delete`, request);
  }

  create(request: TableBookingCreateRequest): Observable<TableBookingCreateResponse> {
    return this.http
      .post<TableBookingCreateResponse>(
        `${this.baseUrl}/create`,
        this.normalizeCreateRequest(request),
      )
      .pipe(map((response) => this.normalizeSingleResponse(response)));
  }

  update(request: TableBookingUpdateRequest): Observable<TableBookingUpdateResponse> {
    return this.http
      .post<TableBookingUpdateResponse>(
        `${this.baseUrl}/update`,
        this.normalizeUpdateRequest(request),
      )
      .pipe(map((response) => this.normalizeSingleResponse(response)));
  }

  search(request: TableBookingSearchRequest): Observable<TableBookingSearchResponse> {
    return this.http
      .post<TableBookingSearchResponse>(
        `${this.baseUrl}/search`,
        this.normalizeSearchRequest(request),
      )
      .pipe(map((response) => this.normalizeSearchResponse(response)));
  }

  searchPendingAndConfirmedBookings(
    request: TableBookingSearchRequest,
  ): Observable<TableBookingSearchResponse> {
    return this.http
      .post<TableBookingSearchResponse>(
        `${this.baseUrl}/pending-job`,
        this.normalizeSearchRequest(request),
      )
      .pipe(map((response) => this.normalizeSearchResponse(response)));
  }

  updateStatus(
    request: TableBookingUpdateStatusRequest,
  ): Observable<TableBookingUpdateStatusResponse> {
    return this.http
      .post<TableBookingUpdateStatusResponse>(
        `${this.baseUrl}/update-status`,
        this.normalizeUpdateStatusRequest(request),
      )
      .pipe(map((response) => this.normalizeSingleResponse(response)));
  }

  checkIn(request: TableBookingCheckInRequest): Observable<TableBookingCheckInResponse> {
    return this.http
      .post<TableBookingCheckInResponse>(
        `${this.baseUrl}/check-in`,
        this.normalizeCheckInRequest(request),
      )
      .pipe(map((response) => this.normalizeSingleResponse(response)));
  }

  checkOut(request: TableBookingCheckOutRequest): Observable<TableBookingCheckOutResponse> {
    return this.http
      .post<TableBookingCheckOutResponse>(
        `${this.baseUrl}/check-out`,
        this.normalizeCheckOutRequest(request),
      )
      .pipe(map((response) => this.normalizeCheckOutResponse(response)));
  }

  getBookingDetail(request: TableBookingDetailRequest): Observable<TableBookingDetailResponse> {
    return this.http
      .post<TableBookingDetailResponse>(
        `${this.baseUrl}/detail`,
        this.normalizeDetailRequest(request),
      )
      .pipe(map((response) => this.normalizeDetailResponse(response)));
  }

  private normalizeCreateRequest(request: TableBookingCreateRequest): TableBookingCreateRequest {
    const expectedArriveTime = this.normalizeRequiredDateTimeValue(
      request.expectedArriveTime,
      'expectedArriveTime',
    );
    const expectedCheckOut = this.normalizeRequiredDateTimeValue(
      request.expectedCheckOut,
      'expectedCheckOut',
    );
    const depositPaidAt = this.normalizeDateTimeValue(request.depositPaidAt);
    const depositTxnRef = request.depositTxnRef?.trim();

    return {
      tableId: request.tableId,
      expectedArriveTime,
      expectedCheckOut,
      ...(request.customerName?.trim() ? { customerName: request.customerName.trim() } : {}),
      ...(request.phoneNumber?.trim() ? { phoneNumber: request.phoneNumber.trim() } : {}),
      ...(typeof request.depositAmount === 'number' && Number.isFinite(request.depositAmount)
        ? { depositAmount: request.depositAmount }
        : {}),
      ...(typeof request.depositPaid === 'boolean' ? { depositPaid: request.depositPaid } : {}),
      ...(request.depositPaidAt === null ? { depositPaidAt: null } : {}),
      ...(depositPaidAt ? { depositPaidAt } : {}),
      ...(typeof request.depositForfeited === 'boolean'
        ? { depositForfeited: request.depositForfeited }
        : {}),
      ...(request.depositTxnRef === null ? { depositTxnRef: null } : {}),
      ...(depositTxnRef ? { depositTxnRef } : {}),
      ...(request.bookingStatus?.trim() ? { bookingStatus: request.bookingStatus.trim() } : {}),
      ...(request.note?.trim() ? { note: request.note.trim() } : {}),
      ...(typeof request.active === 'boolean' ? { active: request.active } : {}),
      ...(typeof request.isWalkIn === 'boolean' ? { isWalkIn: request.isWalkIn } : {}),
    };
  }

  private normalizeUpdateRequest(request: TableBookingUpdateRequest): TableBookingUpdateRequest {
    const expectedArriveTime = this.normalizeRequiredDateTimeValue(
      request.expectedArriveTime,
      'expectedArriveTime',
    );
    const expectedCheckOut = this.normalizeRequiredDateTimeValue(
      request.expectedCheckOut,
      'expectedCheckOut',
    );
    const depositPaidAt = this.normalizeDateTimeValue(request.depositPaidAt);
    const depositTxnRef = request.depositTxnRef?.trim();

    return {
      bookingId: request.bookingId,
      tableId: request.tableId,
      expectedArriveTime,
      expectedCheckOut,
      ...(request.customerName?.trim() ? { customerName: request.customerName.trim() } : {}),
      ...(request.phoneNumber?.trim() ? { phoneNumber: request.phoneNumber.trim() } : {}),
      ...(typeof request.depositAmount === 'number' && Number.isFinite(request.depositAmount)
        ? { depositAmount: request.depositAmount }
        : {}),
      ...(typeof request.depositPaid === 'boolean' ? { depositPaid: request.depositPaid } : {}),
      ...(request.depositPaidAt === null ? { depositPaidAt: null } : {}),
      ...(depositPaidAt ? { depositPaidAt } : {}),
      ...(typeof request.depositForfeited === 'boolean'
        ? { depositForfeited: request.depositForfeited }
        : {}),
      ...(request.depositTxnRef === null ? { depositTxnRef: null } : {}),
      ...(depositTxnRef ? { depositTxnRef } : {}),
      ...(request.bookingStatus?.trim() ? { bookingStatus: request.bookingStatus.trim() } : {}),
      ...(request.note?.trim() ? { note: request.note.trim() } : {}),
      ...(typeof request.active === 'boolean' ? { active: request.active } : {}),
    };
  }

  private normalizeUpdateStatusRequest(
    request: TableBookingUpdateStatusRequest,
  ): TableBookingUpdateStatusRequest {
    const checkInAt = this.normalizeDateTimeValue(request.checkInAt);
    const checkOutAt = this.normalizeDateTimeValue(request.checkOutAt);

    return {
      bookingId: request.bookingId,
      bookingStatus: request.bookingStatus.trim(),
      ...(checkInAt ? { checkInAt } : {}),
      ...(checkOutAt ? { checkOutAt } : {}),
    };
  }

  private normalizeCheckOutRequest(
    request: TableBookingCheckOutRequest,
  ): TableBookingCheckOutRequest {
    const bookingId = this.normalizeRequiredPositiveInteger(request.bookingId, 'bookingId');
    const rawCheckOutAt = request.checkOutAt;
    const normalizedCheckOutAt = this.normalizeDateTimeValue(rawCheckOutAt);

    if (
      rawCheckOutAt !== undefined &&
      rawCheckOutAt !== null &&
      typeof rawCheckOutAt === 'string' &&
      rawCheckOutAt.trim() &&
      !normalizedCheckOutAt
    ) {
      throw new Error('checkOutAt must be ISO 8601 datetime with timezone (Z or +/-HH:mm)');
    }

    return {
      bookingId,
      ...(rawCheckOutAt === null ? { checkOutAt: null } : {}),
      ...(normalizedCheckOutAt ? { checkOutAt: normalizedCheckOutAt } : {}),
    };
  }

  private normalizeCheckInRequest(request: TableBookingCheckInRequest): TableBookingCheckInRequest {
    const bookingId = this.normalizeRequiredPositiveInteger(request.bookingId, 'bookingId');
    const rawCheckInAt = request.checkInAt;
    const normalizedCheckInAt = this.normalizeDateTimeValue(rawCheckInAt);
    const force = request.force === true;

    if (
      rawCheckInAt !== undefined &&
      rawCheckInAt !== null &&
      typeof rawCheckInAt === 'string' &&
      rawCheckInAt.trim() &&
      !normalizedCheckInAt
    ) {
      throw new Error('checkInAt must be ISO 8601 datetime with timezone (Z or +/-HH:mm)');
    }

    return {
      bookingId,
      ...(rawCheckInAt === null ? { checkInAt: null } : {}),
      ...(normalizedCheckInAt ? { checkInAt: normalizedCheckInAt } : {}),
      force,
    };
  }

  private normalizeSearchRequest(request: TableBookingSearchRequest): TableBookingSearchRequest {
    const checkInAt = this.normalizeSearchDateTimeValue(request.checkInAt);
    const checkOutAt = this.normalizeSearchDateTimeValue(request.checkOutAt);

    return {
      ...request,
      page: this.normalizeNumber(request.page),
      limit: this.normalizeNumber(request.limit),
      sortField: this.normalizeSearchSortField(request.sortField),
      sortDir: this.normalizeSortDir(request.sortDir),
      ...(typeof request.tableId === 'number' && Number.isFinite(request.tableId)
        ? { tableId: request.tableId }
        : {}),
      ...(request.bookingStatus?.trim() ? { bookingStatus: request.bookingStatus.trim() } : {}),
      ...(request.customerName?.trim() ? { customerName: request.customerName.trim() } : {}),
      ...(request.phoneNumber?.trim() ? { phoneNumber: request.phoneNumber.trim() } : {}),
      ...(checkInAt ? { checkInAt } : {}),
      ...(checkOutAt ? { checkOutAt } : {}),
    };
  }

  private normalizeDetailRequest(request: TableBookingDetailRequest): TableBookingDetailRequest {
    return {
      bookingId: this.normalizeNumber(request.bookingId),
    };
  }

  private normalizeSingleResponse<T extends TableBookingResponse>(response: {
    status: number;
    message: string;
    data: T;
  }): {
    status: number;
    message: string;
    data: TableBookingResponse;
  } {
    return {
      ...response,
      data: this.normalizeBookingResponse(response.data),
    };
  }

  private normalizeSearchResponse(
    response: TableBookingSearchResponse,
  ): TableBookingSearchResponse {
    const responseData = response.data as unknown;
    const pageData = responseData as {
      data?: unknown;
      content?: unknown;
      items?: unknown;
      records?: unknown;
      result?: unknown;
      rows?: unknown;
      pageNo?: number;
      pageSize?: number;
      totalElements?: number;
      totalPages?: number;
    };

    const rawItems = this.extractItems(responseData);
    const isArrayPayload = Array.isArray(responseData);

    return {
      ...response,
      data: {
        data: rawItems.map((item) => this.normalizeBookingResponse(item)),
        pageNo: isArrayPayload ? 0 : this.normalizeNumber(pageData.pageNo),
        pageSize: isArrayPayload
          ? rawItems.length
          : this.normalizeNumber(pageData.pageSize, rawItems.length),
        totalElements: isArrayPayload
          ? rawItems.length
          : this.normalizeNumber(pageData.totalElements, rawItems.length),
        totalPages: isArrayPayload ? 1 : this.normalizeNumber(pageData.totalPages, 1),
      },
    };
  }

  private normalizeDetailResponse(
    response: TableBookingDetailResponse,
  ): TableBookingDetailResponse {
    return {
      ...response,
      data: this.normalizeBookingDetailData(response.data),
    };
  }

  private normalizeCheckOutResponse(
    response: TableBookingCheckOutResponse,
  ): TableBookingCheckOutResponse {
    return {
      ...response,
      data: this.normalizeCheckOutData(response.data),
    };
  }

  private normalizeBookingResponse(value: unknown): TableBookingResponse {
    const raw = (value ?? {}) as Record<string, unknown>;

    return {
      bookingId: this.normalizeNumber(raw['bookingId']),
      tableId: this.normalizeNumber(raw['tableId']),
      tableCode: this.normalizeString(raw['tableCode']),
      tableName: this.normalizeString(raw['tableName']),
      expectedArriveTime: this.normalizeNullableString(
        raw['expectedArriveTime'],
        raw['bookingTime'],
      ),
      checkInAt: this.normalizeNullableString(raw['checkInAt'], raw['checkInTime']),
      expectedCheckOut: this.normalizeNullableString(raw['expectedCheckOut']),
      checkOutAt: this.normalizeNullableString(raw['checkOutAt']),
      bookingStatus: this.normalizeString(raw['bookingStatus']),
      bookingStatusName: this.normalizeString(raw['bookingStatusName']),
      customerName: this.normalizeString(raw['customerName']),
      phoneNumber: this.normalizeString(raw['phoneNumber']),
      depositAmount: this.normalizeNullableNumber(raw['depositAmount'], raw['deposit']),
      depositPaid: Boolean(raw['depositPaid']),
      depositPaidAt: this.normalizeNullableString(raw['depositPaidAt']),
      depositForfeited: Boolean(raw['depositForfeited']),
      depositTxnRef: this.normalizeNullableString(raw['depositTxnRef']),
      note: this.normalizeNullableString(raw['note']),
      accountId: this.normalizeNullableNumber(raw['accountId']),
      accountUsername: this.normalizeNullableString(raw['accountUsername']),
      accountFullName: this.normalizeNullableString(raw['accountFullName']),
      active: Boolean(raw['active']),
      createdAt: this.normalizeNullableString(raw['createdAt'], raw['createdTime']),
    };
  }

  private normalizeBookingDetailData(value: unknown): TableBookingDetailData {
    const raw = (value ?? {}) as Record<string, unknown>;

    return {
      bookingId: this.normalizeNumber(raw['bookingId']),
      tableId: this.normalizeNumber(raw['tableId']),
      tableCode: this.normalizeString(raw['tableCode']),
      tableName: this.normalizeString(raw['tableName']),
      expectedArriveTime: this.normalizeNullableString(
        raw['expectedArriveTime'],
        raw['bookingTime'],
      ),
      checkInAt: this.normalizeNullableString(raw['checkInAt'], raw['checkInTime']),
      expectedCheckOut: this.normalizeNullableString(raw['expectedCheckOut']),
      checkOutAt: this.normalizeNullableString(raw['checkOutAt']),
      bookingStatus: this.normalizeString(raw['bookingStatus']),
      bookingStatusName: this.normalizeString(raw['bookingStatusName']),
      customerName: this.normalizeNullableString(raw['customerName']),
      phoneNumber: this.normalizeNullableString(raw['phoneNumber']),
      depositAmount: this.normalizeNullableNumber(raw['depositAmount'], raw['deposit']),
      depositPaid: this.normalizeNullableBoolean(raw['depositPaid']),
      depositPaidAt: this.normalizeNullableString(raw['depositPaidAt']),
      depositForfeited: this.normalizeNullableBoolean(raw['depositForfeited']),
      depositTxnRef: this.normalizeNullableString(raw['depositTxnRef']),
      note: this.normalizeNullableString(raw['note']),
      accountId: this.normalizeNullableNumber(raw['accountId']),
      accountUsername: this.normalizeNullableString(raw['accountUsername']),
      accountFullName: this.normalizeNullableString(raw['accountFullName']),
      active: this.normalizeNullableBoolean(raw['active']),
      createdAt: this.normalizeNullableString(raw['createdAt'], raw['createdTime']),
    };
  }

  private normalizeCheckOutData(value: unknown): TableBookingCheckOutData {
    const raw = (value ?? {}) as Record<string, unknown>;

    return {
      bookingId: this.normalizeNumber(raw['bookingId'], this.normalizeNumber(raw['id'])),
      bookingStatus: this.normalizeString(raw['bookingStatus']),
      bookingStatusName: this.normalizeString(raw['bookingStatusName']),
      checkInAt: this.normalizeNullableString(raw['checkInAt']),
      checkOutAt: this.normalizeNullableString(raw['checkOutAt']),
    };
  }

  private extractItems(pageData: unknown): unknown[] {
    if (Array.isArray(pageData)) {
      return pageData;
    }

    const payload = pageData as {
      data?: unknown;
      content?: unknown;
      items?: unknown;
      records?: unknown;
      result?: unknown;
      rows?: unknown;
    };

    const candidate =
      payload.data ??
      payload.content ??
      payload.items ??
      payload.records ??
      payload.result ??
      payload.rows;

    if (Array.isArray(candidate)) {
      return candidate;
    }

    return [];
  }

  private normalizeSortField(value: TableBookingSortField | undefined): TableBookingSortField {
    return this.isSortField(value) ? value : DEFAULT_SORT_FIELD;
  }

  private normalizeSearchSortField(
    value: TableBookingSortField | undefined,
  ): TableBookingSortField {
    return this.isSearchSortField(value) ? value : DEFAULT_SEARCH_SORT_FIELD;
  }

  private normalizeSortDir(value: TableBookingSortDir | undefined): TableBookingSortDir {
    return value === 'asc' || value === 'desc' ? value : DEFAULT_SORT_DIR;
  }

  private isSortField(value: unknown): value is TableBookingSortField {
    return (
      value === 'id' ||
      value === 'expectedArriveTime' ||
      value === 'checkInAt' ||
      value === 'expectedCheckOut' ||
      value === 'checkOutAt' ||
      value === 'bookingStatus' ||
      value === 'customerName' ||
      value === 'phoneNumber' ||
      value === 'depositAmount' ||
      value === 'createdAt'
    );
  }

  private isSearchSortField(value: unknown): value is TableBookingSortField {
    return (
      value === 'checkInAt' ||
      value === 'checkOutAt' ||
      value === 'bookingStatus' ||
      value === 'customerName' ||
      value === 'phoneNumber' ||
      value === 'createdAt' ||
      value === 'id'
    );
  }

  private normalizeNumber(value: unknown, fallback = 0): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  private normalizeNullableNumber(value: unknown, fallback?: unknown): number | null {
    const parsed = this.normalizeNullablePrimitive(value, fallback);

    if (parsed === null) {
      return null;
    }

    const numeric = Number(parsed);
    return Number.isFinite(numeric) ? numeric : null;
  }

  private normalizeNullableBoolean(value: unknown): boolean | null {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      if (value === 1) {
        return true;
      }

      if (value === 0) {
        return false;
      }
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();

      if (normalized === 'true' || normalized === '1') {
        return true;
      }

      if (normalized === 'false' || normalized === '0') {
        return false;
      }
    }

    return null;
  }

  private normalizeString(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }

    return '';
  }

  private normalizeNullableString(value: unknown, fallback?: unknown): string | null {
    const parsed = this.normalizeNullablePrimitive(value, fallback);

    if (parsed === null) {
      return null;
    }

    return String(parsed);
  }

  private normalizeNullablePrimitive(value: unknown, fallback?: unknown): unknown | null {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof fallback === 'string' && fallback.trim()) {
      return fallback.trim();
    }

    if (typeof fallback === 'number' && Number.isFinite(fallback)) {
      return fallback;
    }

    return null;
  }

  private normalizeDateTimeValue(value: unknown): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }

    const trimmed = value.trim();

    if (!trimmed) {
      return undefined;
    }

    const withTimezoneMatch = trimmed.match(
      /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})(?::(\d{2})(\.\d{1,3})?)?(Z|[+-]\d{2}:?\d{2})$/i,
    );

    if (withTimezoneMatch) {
      const [, dateTime, seconds, milliseconds, timezone] = withTimezoneMatch;
      return `${dateTime}:${seconds ?? '00'}${milliseconds ?? ''}${this.normalizeTimezone(timezone)}`;
    }

    const withoutTimezoneMatch = trimmed.match(
      /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})(?::(\d{2})(\.\d{1,3})?)?$/,
    );

    if (withoutTimezoneMatch) {
      const [, dateTime, seconds, milliseconds] = withoutTimezoneMatch;
      return `${dateTime}:${seconds ?? '00'}${milliseconds ?? ''}${this.getLocalTimezoneOffset()}`;
    }

    return undefined;
  }

  private normalizeSearchDateTimeValue(value: unknown): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }

    const trimmed = value.trim();

    if (!trimmed) {
      return undefined;
    }

    const dateOnlyMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);

    if (!dateOnlyMatch) {
      return this.normalizeDateTimeValue(trimmed);
    }

    return `${dateOnlyMatch[1]}T00:00:00${this.getLocalTimezoneOffset()}`;
  }

  private normalizeRequiredDateTimeValue(value: unknown, fieldName: string): string {
    const normalized = this.normalizeDateTimeValue(value);

    if (!normalized) {
      throw new Error(`${fieldName} must be ISO 8601 datetime with timezone (Z or +/-HH:mm)`);
    }

    return normalized;
  }

  private normalizeRequiredPositiveInteger(value: unknown, fieldName: string): number {
    if (
      typeof value !== 'number' ||
      !Number.isFinite(value) ||
      !Number.isInteger(value) ||
      value <= 0
    ) {
      throw new Error(`${fieldName} must be a positive integer`);
    }

    return value;
  }

  private normalizeTimezone(value: string): string {
    if (/^z$/i.test(value)) {
      return 'Z';
    }

    if (/^[+-]\d{2}:\d{2}$/.test(value)) {
      return value;
    }

    if (/^[+-]\d{4}$/.test(value)) {
      return `${value.slice(0, 3)}:${value.slice(3)}`;
    }

    return value;
  }

  private getLocalTimezoneOffset(): string {
    const totalMinutes = -new Date().getTimezoneOffset();
    const sign = totalMinutes >= 0 ? '+' : '-';
    const absoluteMinutes = Math.abs(totalMinutes);
    const hours = String(Math.floor(absoluteMinutes / 60)).padStart(2, '0');
    const minutes = String(absoluteMinutes % 60).padStart(2, '0');

    return `${sign}${hours}:${minutes}`;
  }
}
