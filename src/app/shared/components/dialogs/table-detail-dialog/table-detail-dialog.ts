import { AsyncPipe, CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TuiButton, TuiDialogContext } from '@taiga-ui/core';
import { injectContext } from '@taiga-ui/polymorpheus';
import { catchError, map, Observable, of, shareReplay, startWith, Subject, switchMap } from 'rxjs';

import { TableDetail, TableStatus } from '../../../../core/models/table/table.model';
import { TableService } from '../../../../core/services/table/table.service';

type TableDetailDialogInput = number | { tableId: number };

interface TableDetailViewModel {
  tableName: string;
  tableCode: string;
  statusLabel: string;
  statusClass: string;
  floorLabel: string;
  seatLabel: string;
  activeLabel: string;
  activeClass: string;
  totalBookingLabel: string;
  lastBookingLabel: string;
  managementNote: string;
}

interface TableDetailViewState {
  isLoading: boolean;
  error: string | null;
  detail: TableDetail | null;
  vm: TableDetailViewModel | null;
}

const STATUS_LABEL_MAP: Record<TableStatus, string> = {
  AVAILABLE: 'Bàn trống',
  OCCUPIED: 'Đang sử dụng',
  BOOKED: 'Đã đặt',
};

const STATUS_CLASS_MAP: Record<TableStatus, string> = {
  AVAILABLE: 'table-status-pill--available',
  OCCUPIED: 'table-status-pill--occupied',
  BOOKED: 'table-status-pill--booked',
};

@Component({
  standalone: true,
  selector: 'app-table-detail-dialog',
  imports: [AsyncPipe, CommonModule, TuiButton],
  templateUrl: './table-detail-dialog.html',
  styleUrl: './table-detail-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableDetailDialog {
  private readonly context = injectContext<TuiDialogContext<void, TableDetailDialogInput>>();
  private readonly tableService = inject(TableService);
  private readonly reload$ = new Subject<void>();
  private readonly tableId = this.resolveTableId(this.context.data);

  readonly detailState$: Observable<TableDetailViewState> = this.reload$.pipe(
    startWith(void 0),
    switchMap(() => this.fetchDetailState()),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  close(): void {
    this.context.completeWith();
  }

  retry(): void {
    this.reload$.next();
  }

  private fetchDetailState(): Observable<TableDetailViewState> {
    if (this.tableId === null) {
      return of({
        isLoading: false,
        error: 'Thiếu mã bàn để tải thông tin chi tiết.',
        detail: null,
        vm: null,
      });
    }

    return this.tableService.detail({ tableId: this.tableId }).pipe(
      map((response) => response?.data ?? null),
      map((detail) => {
        if (!detail) {
          return {
            isLoading: false,
            error: 'Không tìm thấy dữ liệu bàn tương ứng.',
            detail: null,
            vm: null,
          };
        }

        return {
          isLoading: false,
          error: null,
          detail,
          vm: this.toViewModel(detail),
        };
      }),
      startWith({
        isLoading: true,
        error: null,
        detail: null,
        vm: null,
      }),
      catchError((error) => {
        console.error('Loi khi tai chi tiet ban', error);
        return of({
          isLoading: false,
          error: 'Không tải được thông tin bàn. Vui lòng thử lại.',
          detail: null,
          vm: null,
        });
      }),
    );
  }

  private toViewModel(detail: TableDetail): TableDetailViewModel {
    return {
      tableName: detail.tableName || '-',
      tableCode: detail.tableCode || '-',
      statusLabel:
        detail.tableStatusName || STATUS_LABEL_MAP[detail.tableStatus] || 'Không xác định',
      statusClass: STATUS_CLASS_MAP[detail.tableStatus] || 'table-status-pill--unknown',
      floorLabel: Number.isFinite(detail.floor) ? `Tầng ${detail.floor}` : '-',
      seatLabel: Number.isFinite(detail.slot) ? `${detail.slot} người` : '-',
      activeLabel: detail.active ? 'Đang hoạt động' : 'Tạm ngưng hoạt động',
      activeClass: detail.active ? 'table-active-dot--on' : 'table-active-dot--off',
      totalBookingLabel: Number.isFinite(detail.totalBooking) ? `${detail.totalBooking}` : '-',
      lastBookingLabel: this.formatDateTime(detail.lastBookingTime),
      managementNote:
        detail.description?.trim() ||
        'Chưa có ghi chú quản lý cho bàn này. Bạn có thể cập nhật thông tin tại trang quản lý bàn.',
    };
  }

  private resolveTableId(data: TableDetailDialogInput | undefined): number | null {
    if (typeof data === 'number' && Number.isFinite(data) && data > 0) {
      return data;
    }

    if (data && typeof data === 'object') {
      const tableId = data.tableId;
      if (Number.isFinite(tableId) && tableId > 0) {
        return tableId;
      }
    }

    return null;
  }

  private formatDateTime(value: string | null | undefined): string {
    if (!value) {
      return '-';
    }

    const parsedDate = new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(parsedDate);
  }
}
