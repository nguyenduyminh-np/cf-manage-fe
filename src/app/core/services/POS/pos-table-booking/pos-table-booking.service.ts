import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import {
  BookingRequestPayload,
  TableBookingCreateResponse,
  TableCard,
  TableSearchQuery,
} from '../../../models/table-booking/table-booking.model';
import {
  TableAvailableResponseDTO,
  TableAvailableSearchRequestDTO,
} from '../../../models/table/table.model';
import { TableBookingService } from '../../table-booking/table-booking.service';
import { TableService } from '../../table/table.service';

@Injectable({ providedIn: 'root' })
export class PosTableBookingService {
  private readonly tableService = inject(TableService);
  private readonly tableBookingService = inject(TableBookingService);

  createBooking(payload: BookingRequestPayload): Observable<TableBookingCreateResponse> {
    return this.tableBookingService.create({
      tableId: payload.tableId,
      expectedArriveTime: payload.expectedArriveTime,
      expectedCheckOut: payload.expectedCheckOut,
      customerName: payload.customerName,
      phoneNumber: payload.phoneNumber,
      depositAmount: payload.depositAmount ?? undefined,
      depositPaid: payload.depositPaid,
      depositPaidAt: payload.depositPaidAt,
      bookingStatus: payload.bookingStatus,
      note: payload.note,
      ...(typeof payload.isWalkIn === 'boolean' ? { isWalkIn: payload.isWalkIn } : {}),
    });
  }

  searchAvailableTables(query: TableSearchQuery | null | undefined): Observable<TableCard[]> {
    const request = this.toRequest(query);

    return this.tableService.getAvailableTables(request).pipe(
      map((response) => response.data ?? []),
      map((rows) =>
        rows
          .map((row) => this.toTableCard(row))
          .filter((table): table is TableCard => table !== null),
      ),
    );
  }

  private toRequest(
    query: TableSearchQuery | null | undefined,
  ): TableAvailableSearchRequestDTO | null {
    if (!query) {
      return null;
    }

    const request: TableAvailableSearchRequestDTO = {};
    const keyword = query.keyword.trim();

    if (keyword) {
      request.table_name = keyword;
    }

    if (this.isValidFloor(query.floor)) {
      request.floor = query.floor;
    }

    if (this.isValidSeat(query.seat)) {
      request.seat = query.seat;
    }

    return Object.keys(request).length > 0 ? request : null;
  }

  private toTableCard(row: TableAvailableResponseDTO): TableCard | null {
    const tableId = this.resolveTableId(row);

    if (tableId <= 0) {
      return null;
    }

    const raw = row as unknown as Record<string, unknown>;

    return {
      tableId,
      tableName: this.normalizeString(
        this.resolveString(raw, ['tableName', 'table_name']),
        `Ban ${tableId}`,
      ),
      tableCode: this.normalizeString(
        this.resolveString(raw, ['tableCode', 'table_code']),
        `T-${tableId}`,
      ),
      tableStatus: this.normalizeString(
        this.resolveString(raw, ['tableStatus', 'table_status']),
        'AVAILABLE',
      ),
      floor: this.normalizePositiveNumber(this.resolveNumber(raw, ['floor'])),
      slot: this.normalizePositiveNumber(this.resolveNumber(raw, ['slot', 'seat'])),
    };
  }

  private resolveTableId(row: TableAvailableResponseDTO): number {
    const raw = row as unknown as Record<string, unknown>;
    const idValue = this.resolveNumber(raw, ['tableId', 'id', 'table_id']);

    return this.normalizePositiveNumber(idValue);
  }

  private resolveString(source: Record<string, unknown>, keys: string[]): string | undefined {
    for (const key of keys) {
      const value = source[key];

      if (typeof value === 'string' && value.trim()) {
        return value;
      }
    }

    return undefined;
  }

  private resolveNumber(source: Record<string, unknown>, keys: string[]): number | undefined {
    for (const key of keys) {
      const value = source[key];

      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }

      if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value);

        if (Number.isFinite(parsed)) {
          return parsed;
        }
      }
    }

    return undefined;
  }

  private normalizeString(value: string | undefined, fallback: string): string {
    const normalized = value?.trim();
    return normalized ? normalized : fallback;
  }

  private normalizePositiveNumber(value: number | undefined): number {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      return value;
    }

    return 0;
  }

  private isValidFloor(value: number | null): value is number {
    return typeof value === 'number' && Number.isFinite(value) && value >= 1 && value <= 100;
  }

  private isValidSeat(value: number | null): value is number {
    return typeof value === 'number' && Number.isFinite(value) && value >= 1 && value <= 1000;
  }
}
