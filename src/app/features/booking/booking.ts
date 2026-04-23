import { NgClass } from '@angular/common';
import {
  Component,
  DestroyRef,
  HostListener,
  Injector,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { TuiButton, TuiDialogService } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { finalize, map, Observable, of, switchMap } from 'rxjs';

import { TableStatus } from '../../core/models/table/table.model';
import {
  PosTableBookingDialogInput,
  PosTableBookingDialogResult,
  TableBookingResponse,
} from '../../core/models/table-booking/table-booking.model';
import { TableBookingService } from '../../core/services/table-booking/table-booking.service';
import { PosTableBooking } from '../../shared/components/dialogs/pos-table-booking/pos-table-booking';
import {
  PosOrderDishes,
  PosOrderDishesDialogInput,
} from '../../shared/components/dialogs/pos-order-dishes/pos-order-dishes';
import { TableBookingDetail } from '../../shared/components/dialogs/table-booking-detail/table-booking-detail';
import { TableBookingHistory } from '../../shared/components/dialogs/table-booking-history/table-booking-history';
import { TableDetailDialog } from '../../shared/components/dialogs/table-detail-dialog/table-detail-dialog';
import {
  BookingFacade,
  BookingSearchFormValue,
  BookingTable,
  FloorFilterValue,
  FloorValue,
  SeatFilterValue,
  StatusFilterValue,
} from '../../core/facade/booking.facade';
import { OrderDishesHistory } from '../../shared/components/dialogs/order-dishes-history/order-dishes-history';

@Component({
  selector: 'app-booking',
  imports: [ReactiveFormsModule, TuiButton, NgClass],
  providers: [BookingFacade],
  templateUrl: './booking.html',
  styleUrl: './booking.scss',
})
export class Booking implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly facade = inject(BookingFacade);
  private readonly dialogService = inject(TuiDialogService);
  private readonly tableBookingService = inject(TableBookingService);
  private tableCardClickTimer: ReturnType<typeof setTimeout> | null = null;
  private tableCardClickTargetId: number | null = null;
  protected readonly isEmptyingTable = signal(false);
  protected readonly checkingInTableId = signal<number | null>(null);
  protected readonly tableActionError = signal<string | null>(null);

  protected readonly contextMenuState = signal<{
    isOpen: boolean;
    x: number;
    y: number;
    table: BookingTable | null;
  }>({
    isOpen: false,
    x: 0,
    y: 0,
    table: null,
  });

  protected readonly tableMenuOptions = [
    { key: 'history', label: 'Lịch sử đặt bàn', icon: 'history' },
    { key: 'orderHistory', label: 'Lịch sử gọi món', icon: 'receipt_long' },
    { key: 'book', label: 'Đặt bàn', icon: 'calendar_add_on' },
    { key: 'walkIn', label: 'Khách vãng lai', icon: 'directions_walk' },
    { key: 'empty', label: 'Làm trống', icon: 'cleaning_services' },
    { key: 'detail', label: 'Xem chi tiết', icon: 'visibility' },
  ] as const;

  protected readonly floorTabs = [
    { label: 'Tầng 1', value: 1 as FloorValue },
    { label: 'Tầng 2', value: 2 as FloorValue },
    { label: 'Tầng 3', value: 3 as FloorValue },
  ] as const;

  protected readonly seatOptions = [
    { label: 'Tất cả', value: null },
    { label: '2 chỗ', value: 2 },
    { label: '4 chỗ', value: 4 },
    { label: '6 chỗ', value: 6 },
    { label: '8 chỗ', value: 8 },
  ] as const;

  protected readonly statusOptions = [
    { label: 'Tất cả', value: null },
    { label: 'Bàn trống', value: 'AVAILABLE' },
    { label: 'Đang sử dụng', value: 'OCCUPIED' },
    { label: 'Đã đặt', value: 'BOOKED' },
  ] as const;

  protected readonly floorOptions = [
    { label: 'Tất cả', value: null },
    { label: 'Tầng 1', value: 1 },
    { label: 'Tầng 2', value: 2 },
    { label: 'Tầng 3', value: 3 },
  ] as const;

  protected readonly searchForm = this.fb.group({
    keyword: this.fb.nonNullable.control(''),
    seats: this.fb.control<SeatFilterValue>(null),
    status: this.fb.control<StatusFilterValue>(null),
    floor: this.fb.control<FloorFilterValue>(null),
  });

  public ngOnInit(): void {
    this.facade.initialize(this.toSearchFormValue(this.searchForm.getRawValue()));

    this.searchForm.valueChanges
      .pipe(
        map((value) => this.toSearchFormValue(value)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((filters) => {
        this.facade.onFiltersChanged(filters);
      });
  }

  protected get selectedFloor(): FloorValue | null {
    return this.searchForm.controls.floor.value;
  }

  protected get currentPageWithinRange(): number {
    return this.facade.currentPageWithinRange();
  }

  protected get totalCount(): number {
    return this.facade.totalCount();
  }

  protected get pagedTables(): BookingTable[] {
    return this.facade.pagedTables();
  }

  protected get visibleCount(): number {
    return this.facade.visibleCount();
  }

  protected get countStart(): number {
    return this.facade.countStart();
  }

  protected get countEnd(): number {
    return this.facade.countEnd();
  }

  protected get visiblePageNumbers(): number[] {
    return this.facade.visiblePageNumbers();
  }

  protected get totalPages(): number {
    return this.facade.totalPages();
  }

  protected get isLoading(): boolean {
    return this.facade.isLoading();
  }

  protected get loadError(): string {
    return this.facade.loadError();
  }

  protected setFloorTab(floor: FloorValue): void {
    this.searchForm.controls.floor.setValue(floor);
  }

  protected search(): void {
    this.facade.forceReload();
  }

  protected goToPage(page: number): void {
    this.facade.goToPage(page);
  }

  protected goToPreviousPage(): void {
    this.goToPage(this.currentPageWithinRange - 1);
  }

  protected goToNextPage(): void {
    this.goToPage(this.currentPageWithinRange + 1);
  }

  protected trackByTable(_: number, table: BookingTable): number {
    return table.tableId;
  }

  protected trackByPage(_: number, page: number): number {
    return page;
  }

  protected badgeClass(status: TableStatus): string {
    return `booking-card__badge--${status.toLowerCase()}`;
  }

  protected onTableCardClick(event: MouseEvent, table: BookingTable): void {
    void event;

    this.scheduleTableCardAction(table);
  }

  protected onTableCardDoubleClick(event: MouseEvent, table: BookingTable): void {
    event.preventDefault();
    event.stopPropagation();
    this.cancelTableCardAction();
    this.openTableDetail(table.tableId);
  }

  protected openTableMenu(event: MouseEvent, table: BookingTable): void {
    event.preventDefault();
    this.tableActionError.set(null);

    this.contextMenuState.set({
      isOpen: true,
      x: event.clientX,
      y: event.clientY,
      table,
    });
  }

  protected onMenuAction(action: (typeof this.tableMenuOptions)[number]['key']): void {
    const selectedTable = this.contextMenuState().table;
    this.tableActionError.set(null);

    this.closeTableMenu();

    if (!selectedTable) {
      return;
    }

    switch (action) {
      case 'history':
        this.openTableBookingHistory(selectedTable);
        break;
      case 'orderHistory': // <-- Thêm case này
        this.openOrderDishesHistory(selectedTable);
        break;
      case 'book':
        this.bookTable(selectedTable.tableId);
        break;
      case 'walkIn':
        this.openPosTableBookingDialog({
          tableId: selectedTable.tableId,
          walkIn: true,
        });
        break;
      case 'empty':
        this.emptyTable(selectedTable);
        break;
      case 'detail':
        this.openTableDetail(selectedTable.tableId);
        break;
      default:
        break;
    }
  }

  protected closeTableMenu(): void {
    if (!this.contextMenuState().isOpen) {
      return;
    }

    this.contextMenuState.set({
      isOpen: false,
      x: 0,
      y: 0,
      table: null,
    });
  }

  protected onCheckInClick(event: MouseEvent, table: BookingTable): void {
    event.preventDefault();
    event.stopPropagation();
    this.checkInTable(table);
  }

  protected onOrderDishesClick(event: MouseEvent, table: BookingTable): void {
    event.preventDefault();
    event.stopPropagation();
    this.openPosOrderDishesDialog(table);
  }

  protected isCheckingInTable(tableId: number): boolean {
    return this.checkingInTableId() === tableId;
  }

  @HostListener('document:click')
  protected onDocumentClick(): void {
    this.closeTableMenu();
  }

  @HostListener('document:scroll')
  protected onDocumentScroll(): void {
    this.closeTableMenu();
  }

  @HostListener('window:resize')
  protected onWindowResize(): void {
    this.closeTableMenu();
  }

  @HostListener('document:keydown.escape')
  protected onEscKey(): void {
    this.closeTableMenu();
  }

  protected openTableDetail(tableId: number): void {
    this.dialogService
      .open(new PolymorpheusComponent(TableDetailDialog, this.injector), {
        data: tableId,
        size: 'auto',
        dismissible: true,
        closeable: true,
        label: 'Chi tiết bàn',
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  protected openTableBookingHistory(table: BookingTable | number): void {
    const dialogData =
      typeof table === 'number'
        ? { tableId: table }
        : { tableId: table.tableId, tableName: table.tableName };

    this.dialogService
      .open(new PolymorpheusComponent(TableBookingHistory, this.injector), {
        data: dialogData,
        size: 'auto',
        dismissible: true,
        closeable: true,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  protected openOrderDishesHistory(table: BookingTable): void {
    this.dialogService
      .open<void>(new PolymorpheusComponent(OrderDishesHistory, this.injector), {
        data: { tableId: table.tableId, tableName: table.tableName },
        size: 'auto',
        dismissible: true,
        closeable: true, // Dialog đã có nút Đóng riêng
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  protected openPosTableBookingDialog(dialogData?: PosTableBookingDialogInput): void {
    this.dialogService
      .open<PosTableBookingDialogResult | null>(
        new PolymorpheusComponent(PosTableBooking, this.injector),
        {
          data: dialogData,
          size: 'auto',
          dismissible: true,
          closeable: false,
        },
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (!result) {
          return;
        }

        this.facade.forceReload();
      });
  }

  protected openPosOrderDishesDialog(table: BookingTable): void {
    const dialogData: PosOrderDishesDialogInput = {
      tableId: table.tableId,
      tableName: table.tableName,
      pax: table.slot,
    };

    this.dialogService
      .open<void>(new PolymorpheusComponent(PosOrderDishes, this.injector), {
        data: dialogData,
        size: 'auto',
        dismissible: true,
        closeable: false,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  protected openTableBookingDetail(bookingId: number): void {
    this.dialogService
      .open(new PolymorpheusComponent(TableBookingDetail, this.injector), {
        data: { bookingId },
        size: 'auto',
        dismissible: true,
        closeable: true,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  private bookTable(tableId: number): void {
    this.openPosTableBookingDialog({ tableId });
  }

  private scheduleTableCardAction(table: BookingTable): void {
    this.cancelTableCardAction();
    this.tableCardClickTargetId = table.tableId;
    this.tableCardClickTimer = setTimeout(() => {
      this.tableCardClickTimer = null;
      this.tableCardClickTargetId = null;
      this.openTableBookingHistory(table);
    }, 220);
  }

  private cancelTableCardAction(): void {
    if (this.tableCardClickTimer !== null) {
      clearTimeout(this.tableCardClickTimer);
      this.tableCardClickTimer = null;
    }

    this.tableCardClickTargetId = null;
  }

  private emptyTable(table: BookingTable): void {
    if (this.isEmptyingTable()) {
      return;
    }

    if (table.tableStatus !== 'OCCUPIED') {
      this.tableActionError.set('Chỉ có thể làm trống bàn đang sử dụng.');
      return;
    }

    this.isEmptyingTable.set(true);

    this.resolveCheckoutBookingId(table.tableId)
      .pipe(
        switchMap((bookingId) => {
          if (!bookingId) {
            this.tableActionError.set(
              'Không tìm thấy booking đang hoạt động để checkout cho bàn này.',
            );
            return of(null);
          }

          return this.tableBookingService.checkOut({ bookingId });
        }),
        finalize(() => this.isEmptyingTable.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          if (!response) {
            return;
          }

          const completedBookingId = response.data.bookingId;

          if (!Number.isFinite(completedBookingId) || completedBookingId <= 0) {
            this.tableActionError.set(
              'Checkout thành công nhưng không nhận được bookingId hợp lệ để mở chi tiết.',
            );
            this.facade.forceReload();
            return;
          }

          this.facade.forceReload();
          this.openTableBookingDetail(completedBookingId);
        },
        error: (error: unknown) => {
          this.tableActionError.set(this.resolveCheckoutErrorMessage(error));
        },
      });
  }

  private checkInTable(table: BookingTable): void {
    if (this.isCheckingInTable(table.tableId)) {
      return;
    }

    if (table.tableStatus !== 'BOOKED') {
      this.tableActionError.set('Chỉ có thể check-in bàn ở trạng thái Đã đặt.');
      return;
    }

    this.tableActionError.set(null);
    this.checkingInTableId.set(table.tableId);

    this.resolveCheckInBookingId(table.tableId)
      .pipe(
        switchMap((bookingId) => {
          if (!bookingId) {
            this.tableActionError.set('Không tìm thấy booking hợp lệ để check-in cho bàn này.');
            return of(null);
          }

          return this.tableBookingService.checkIn({ bookingId, force: false });
        }),
        finalize(() => this.checkingInTableId.set(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          if (!response) {
            return;
          }

          const checkedInBookingId = response.data.bookingId;

          if (!Number.isFinite(checkedInBookingId) || checkedInBookingId <= 0) {
            this.tableActionError.set(
              'Check-in thành công nhưng không nhận được bookingId hợp lệ để mở chi tiết.',
            );
            this.facade.forceReload();
            return;
          }

          this.facade.forceReload();
          this.openTableBookingDetail(checkedInBookingId);
        },
        error: (error: unknown) => {
          this.tableActionError.set(this.resolveCheckInErrorMessage(error));
        },
      });
  }

  private resolveCheckInBookingId(tableId: number): Observable<number | null> {
    return this.tableBookingService
      .search({
        page: 0,
        limit: 20,
        sortField: 'expectedArriveTime',
        sortDir: 'desc',
        tableId,
        active: true,
      })
      .pipe(
        map((response) => response?.data?.data ?? []),
        map((items) => this.pickCheckInBookingId(items, tableId)),
      );
  }

  private pickCheckInBookingId(items: TableBookingResponse[], tableId: number): number | null {
    if (!Array.isArray(items) || !items.length) {
      return null;
    }

    const scopedItems = items.filter((item) => item.tableId === tableId && item.active !== false);

    if (!scopedItems.length) {
      return null;
    }

    const preferredStatuses = new Set(['CONFIRMED', 'PENDING_CONFIRMATION']);
    const preferredItem = scopedItems.find((item) =>
      preferredStatuses.has((item.bookingStatus || '').trim().toUpperCase()),
    );
    const targetItem = preferredItem ?? scopedItems[0];

    return Number.isFinite(targetItem.bookingId) && targetItem.bookingId > 0
      ? targetItem.bookingId
      : null;
  }

  private resolveCheckInErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      const message = error.message?.trim();

      if (message === 'bookingId must be a positive integer') {
        return 'bookingId check-in không hợp lệ.';
      }

      if (message === 'checkInAt must be ISO 8601 datetime with timezone (Z or +/-HH:mm)') {
        return 'checkInAt không đúng định dạng thời gian ISO-8601.';
      }
    }

    const httpError = error as {
      status?: number;
      error?: {
        code?: string;
        message?: string;
      };
    };

    const statusCode = httpError?.status;
    const backendCode = httpError?.error?.code;
    const backendMessage = httpError?.error?.message;

    if (statusCode === 400 && backendCode === 'INVALID_DATA') {
      return 'Dữ liệu check-in không hợp lệ. Vui lòng kiểm tra lại booking hiện tại.';
    }

    if (statusCode === 400 && backendCode === 'BOOKING_STATE_TRANSITION_INVALID') {
      return 'Booking hiện tại không ở trạng thái cho phép check-in.';
    }

    if (statusCode === 409 && backendCode === 'BOOKING_TABLE_LOCK_BUSY') {
      return 'Bàn đang được thao tác bởi request khác. Vui lòng thử lại.';
    }

    if (statusCode === 401 || statusCode === 403) {
      return 'Bạn không có quyền check-in bàn này.';
    }

    if (typeof backendMessage === 'string' && backendMessage.trim()) {
      return backendMessage.trim();
    }

    return 'Không thể check-in bàn lúc này. Vui lòng thử lại.';
  }

  private resolveCheckoutBookingId(tableId: number): Observable<number | null> {
    return this.tableBookingService
      .search({
        page: 0,
        limit: 20,
        sortField: 'checkInAt',
        sortDir: 'desc',
        tableId,
        active: true,
      })
      .pipe(
        map((response) => response?.data?.data ?? []),
        map((items) => this.pickCheckoutBookingId(items, tableId)),
      );
  }

  private pickCheckoutBookingId(items: TableBookingResponse[], tableId: number): number | null {
    if (!Array.isArray(items) || !items.length) {
      return null;
    }

    const scopedItems = items.filter((item) => item.tableId === tableId && item.active !== false);

    if (!scopedItems.length) {
      return null;
    }

    const ongoingItems = scopedItems.filter((item) => !item.checkOutAt);
    const preferredStatuses = new Set(['CHECKED_IN', 'CONFIRMED', 'PENDING_CONFIRMATION']);
    const preferredItem = ongoingItems.find((item) =>
      preferredStatuses.has((item.bookingStatus || '').trim().toUpperCase()),
    );
    const targetItem = preferredItem ?? ongoingItems[0] ?? scopedItems[0];

    return Number.isFinite(targetItem.bookingId) && targetItem.bookingId > 0
      ? targetItem.bookingId
      : null;
  }

  private resolveCheckoutErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      const message = error.message?.trim();

      if (message === 'bookingId must be a positive integer') {
        return 'bookingId checkout không hợp lệ.';
      }

      if (message === 'checkOutAt must be ISO 8601 datetime with timezone (Z or +/-HH:mm)') {
        return 'checkOutAt không đúng định dạng thời gian ISO-8601.';
      }
    }

    const httpError = error as {
      status?: number;
      error?: {
        code?: string;
        message?: string;
      };
    };

    const statusCode = httpError?.status;
    const backendCode = httpError?.error?.code;
    const backendMessage = httpError?.error?.message;

    if (statusCode === 400 && backendCode === 'INVALID_DATA') {
      return 'Dữ liệu checkout chưa hợp lệ. Vui lòng kiểm tra lại booking hiện tại.';
    }

    if (statusCode === 400 && backendCode === 'BOOKING_STATE_TRANSITION_INVALID') {
      return 'Booking hiện tại không ở trạng thái cho phép checkout.';
    }

    if (statusCode === 409 && backendCode === 'TABLE_LOCK_BUSY') {
      return 'Bàn đang được xử lý bởi người khác. Vui lòng thử lại sau ít giây.';
    }

    if (statusCode === 401 || statusCode === 403) {
      return 'Bạn không có quyền checkout bàn này.';
    }

    if (typeof backendMessage === 'string' && backendMessage.trim()) {
      return backendMessage.trim();
    }

    return 'Không thể làm trống bàn lúc này. Vui lòng thử lại.';
  }

  private toSearchFormValue(value: Partial<BookingSearchFormValue>): BookingSearchFormValue {
    return {
      keyword: value.keyword ?? '',
      seats: value.seats ?? null,
      status: value.status ?? null,
      floor: value.floor ?? null,
    };
  }
}
