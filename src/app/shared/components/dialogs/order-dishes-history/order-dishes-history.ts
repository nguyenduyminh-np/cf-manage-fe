import { AsyncPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  inject,
  output,
  Injector,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TuiDialogService, TuiDialogContext, TuiButton, TuiAlertService } from '@taiga-ui/core';
import { AgGridAngular } from 'ag-grid-angular';
import {
  ColDef,
  GridApi,
  GridReadyEvent,
  GridSizeChangedEvent,
  ICellRendererParams,
  RowSelectionOptions,
} from 'ag-grid-community';
import { injectContext, PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { ConfirmDialog } from '../confirm-dialog/confirm-dialog';
import {
  PosConfirmPayment,
  PosConfirmPaymentResult,
} from '../pos-confirm-payment/pos-confirm-payment';
import {
  PaymentSuccessDialog,
  PaymentSuccessDialogInput,
} from '../payment-success-dialog/payment-success-dialog';
import {
  BehaviorSubject,
  Observable,
  map,
  startWith,
  switchMap,
  tap,
  shareReplay,
  catchError,
  of,
  debounceTime,
  distinctUntilChanged,
  finalize,
  firstValueFrom,
} from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  BulkUpdateStatusResponse,
  OrderHistoryItem,
  OrderHistorySearchRequest,
  OrderHistorySearchResponse,
} from '../../../../core/models/order-dishes/order-dishes.model';
import { OrderDishesHistoryService } from '../../../../core/services/order-dishes/order-dishes.service';
import { PaymentData } from '../../../../core/models/payment/payment.model';

interface OrderHistoryGridRow extends OrderHistoryItem {
  stt: number;
  createdAtDisplay: string;
  totalAmountDisplay: string;
}

interface OrderHistoryViewState {
  isLoading: boolean;
  error: string | null;
  rowData: OrderHistoryGridRow[];
  currentPage: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
}

interface OrderHistoryFilters {
  tableName: string;
  employeeName: string;
  status: string;
  sortField: string;
  sortDir: 'asc' | 'desc';
}

interface OrderHistoryQuery {
  page: number;
  limit: number;
  filters: OrderHistoryFilters;
}

type TableIdInput = number | { tableId: number; tableName?: string | null };

@Component({
  standalone: true,
  selector: 'app-order-dishes-history',
  imports: [AsyncPipe, AgGridAngular, FormsModule, TuiButton],
  providers: [OrderDishesHistoryService],
  templateUrl: './order-dishes-history.html',
  styleUrl: './order-dishes-history.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderDishesHistory {
  private readonly orderHistoryService = inject(OrderDishesHistoryService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialogContext = injectContext<TuiDialogContext<void, TableIdInput>>();
  private readonly alert = inject(TuiAlertService);
  private readonly dialogService = inject(TuiDialogService);
  private readonly injector = inject(Injector);

  // Dialog input
  readonly tableId: number | null = this.resolveTableId(this.dialogContext.data);
  readonly initialTableName: string = this.resolveTableName(this.dialogContext.data);
  protected isBulkUpdating = false;
  readonly closed = output<void>();

  protected selectedRows: OrderHistoryGridRow[] = [];
  protected selectedStatus: string | null = null;

  protected onSelectionChanged(): void {
    const rows = this.gridApi?.getSelectedRows() || [];
    this.selectedRows = rows;

    if (rows.length === 0) {
      this.selectedStatus = null;
      return;
    }

    const firstStatus = rows[0].dishOrderStatusCode;
    const same = rows.every((r) => r.dishOrderStatusCode === firstStatus);
    this.selectedStatus = same ? firstStatus : null;
  }

  // ✅ Khóa selection khi đang bulk update
  protected isRowSelectable = (node: any) => {
    if (this.isBulkUpdating) return false;
    if (!this.selectedStatus) return true;
    return node.data.dishOrderStatusCode === this.selectedStatus;
  };

  protected get showComplete(): boolean {
    return this.selectedStatus === 'PROCESSING';
  }

  protected get showCancel(): boolean {
    return this.selectedStatus === 'PROCESSING';
  }

  protected get showPay(): boolean {
    return this.selectedStatus === 'DONE';
  }

  protected get hasSelection(): boolean {
    return !!this.selectedStatus;
  }

  protected exportExcel(): void {
    // Placeholder logic for now
    this.showAlert('Tính năng xuất Excel đang được phát triển.', 'Thông báo', 'positive');
  }

  protected confirmAndUpdate(status: string): void {
    if (!this.selectedRows.length) return;

    // Nếu là "Thanh toán" → chuyển sang luồng Payment Flow
    if (status === 'PAID') {
      this.openPaymentFlow();
      return;
    }

    const count = this.selectedRows.length;
    const statusName = this.mapStatusName(status);

    this.dialogService
      .open<boolean>(new PolymorpheusComponent(ConfirmDialog, this.injector), {
        data: {
          message: `Bạn có chắc muốn cập nhật ${count} đơn sang "<strong>${statusName}</strong>"?`,
          confirmText: 'Cập nhật',
          cancelText: 'Hủy',
        },
        label: 'Xác nhận cập nhật',
        size: 'm',
        dismissible: true,
      })
      .subscribe((confirmed) => {
        if (confirmed) {
          this.updateStatusBulk(status);
        }
      });
  }

  /**
   * Luồng thanh toán:
   * 1. Mở PosConfirmPayment dialog với orderId
   * 2. PosConfirmPayment gọi API preview, hiển thị thông tin, gọi API thanh toán
   * 3. Nếu thành công → PosConfirmPayment trả về PaymentData
   * 4. Mở PaymentSuccessDialog hiển thị kết quả
   * 5. Refresh lại danh sách
   */
  private openPaymentFlow(): void {
    if (this.selectedRows.length !== 1) {
      this.showAlert(
        'Vui lòng chọn đúng 1 đơn hàng để thanh toán.',
        'Thông báo',
        'warning',
      );
      return;
    }

    const selectedOrder = this.selectedRows[0];
    const orderId = selectedOrder.dishOrderId;
    const tableName = selectedOrder.tableName || this.initialTableName || 'N/A';

    // Bước 1: Mở dialog xác nhận thanh toán
    this.dialogService
      .open<PosConfirmPaymentResult>(
        new PolymorpheusComponent(PosConfirmPayment, this.injector),
        {
          data: { orderId },
          size: 'auto',
          dismissible: false,
          closeable: false // Không cho click ngoài đóng khi đang thanh toán
        },
      )
      .subscribe((result: PosConfirmPaymentResult) => {
        if (result) {
          // Thanh toán thành công → mở dialog kết quả
          this.openPaymentSuccessDialog(result, tableName);
        }
        // result === null → người dùng đóng/hủy, không làm gì
      });
  }

  /**
   * Mở dialog thông báo thanh toán thành công
   */
  private openPaymentSuccessDialog(paymentData: PaymentData, tableName: string): void {
    const successInput: PaymentSuccessDialogInput = {
      paymentData,
      tableName,
    };

    this.dialogService
      .open<boolean | null>(
        new PolymorpheusComponent(PaymentSuccessDialog, this.injector),
        {
          data: successInput,
          size: 'auto',
          dismissible: true,
        },
      )
      .subscribe(() => {
        // Sau khi đóng dialog success → refresh danh sách & clear selection
        this.gridApi?.deselectAll();
        this.selectedRows = [];
        this.selectedStatus = null;
        const current = this.querySubject.value;
        this.querySubject.next({ ...current });

        this.showAlert(
          'Thanh toán thành công!',
          'Thành công',
          'positive',
        );
      });
  }

  protected updateStatusBulk(status: string): void {
    if (!this.selectedRows.length || this.isBulkUpdating) return;

    const ids = this.selectedRows.map((r) => r.dishOrderId);
    this.isBulkUpdating = true;

    this.orderHistoryService
      .updateStatusBulk({
        dishOrderIds: ids,
        dishOrderStatus: status,
      })
      .pipe(finalize(() => (this.isBulkUpdating = false)))
      .subscribe({
        next: (res) => this.handleBulkResult(res, status),
        error: (err) => {
          console.error(err);
          this.showAlert('Đã xảy ra lỗi khi cập nhật trạng thái.', 'Lỗi', 'negative');
        },
      });
  }

  private handleBulkResult(res: BulkUpdateStatusResponse, status: string): void {
    const successCount = res.successIds?.length ?? 0;
    const failCount = res.failedIds?.length ?? 0;

    this.gridApi?.deselectAll();

    const current = this.querySubject.value;
    this.querySubject.next({ ...current });

    this.selectedRows = [];
    this.selectedStatus = null;

    const statusName = this.mapStatusName(status);

    if (failCount > 0) {
      this.showAlert(
        `Thành công ${successCount}, thất bại ${failCount}`,
        'Kết quả cập nhật',
        'warning',
      );
    } else {
      this.showAlert(
        `Cập nhật đơn đặt món sang trạng thái ${statusName} thành công`,
        'Thành công',
        'positive',
      );
    }
  }

  private mapStatusName(status: string): string {
    switch (status) {
      case 'DONE':
        return 'Hoàn thành';
      case 'PAID':
        return 'Thanh toán';
      case 'CANCEL':
        return 'Hủy đơn';
      default:
        return status;
    }
  }

  private showAlert(
    message: string,
    label: string,
    appearance: 'positive' | 'negative' | 'warning',
  ): void {
    this.alert.open(message, { label, appearance, autoClose: 3000, closeable: true }).subscribe();
  }

  // Filter form
  protected readonly filters: OrderHistoryFilters = {
    tableName: '',
    employeeName: '',
    status: '',
    sortField: 'createdAt',
    sortDir: 'desc',
  };

  protected readonly statusOptions = [
    { label: 'Tất cả', value: '' },
    { label: 'Đang chế biến', value: 'PROCESSING' },
    { label: 'Hoàn thành', value: 'DONE' },
    { label: 'Đã thanh toán', value: 'PAID' },
    { label: 'Đã hủy', value: 'CANCEL' },
  ];

  protected readonly sortFieldOptions = [
    { label: 'Ngày tạo', value: 'createdAt' },
    { label: 'Tên bàn', value: 'tableName' },
    { label: 'Nhân viên', value: 'employeeName' },
    { label: 'Trạng thái', value: 'orderStatus' },
    { label: 'Tổng tiền', value: 'totalAmount' },
  ];

  protected readonly sortDirOptions = [
    { label: 'Giảm dần', value: 'desc' },
    { label: 'Tăng dần', value: 'asc' },
  ];

  protected readonly pageSizeOptions = [10, 20, 50, 100] as const;

  protected advancedSearchOpen = false;
  protected openedDropdown: 'status' | 'pageSize' | null = null;

  private readonly querySubject = new BehaviorSubject<OrderHistoryQuery>({
    page: 1,
    limit: 20,
    filters: this.filters,
  });

  protected gridApi: GridApi<OrderHistoryGridRow> | null = null;
  private latestState: OrderHistoryViewState | null = null;
  private fitGridRafId: number | null = null;
  private filterChanged$ = new BehaviorSubject<void>(undefined);

  protected readonly detailState$: Observable<OrderHistoryViewState> = this.querySubject.pipe(
    switchMap(({ page, limit, filters }) => this.fetchState(page, limit, filters)),
    tap((state) => {
      this.latestState = state;
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  constructor() {
    this.filterChanged$
      .pipe(debounceTime(500), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.applySearch());

    this.destroyRef.onDestroy(() => {
      if (this.fitGridRafId) cancelAnimationFrame(this.fitGridRafId);
    });
  }

  protected readonly defaultColDef: ColDef<OrderHistoryGridRow> = {
    sortable: true,
    resizable: true,
    minWidth: 90,
    flex: 1,
    filter: true,
    menuTabs: ['filterMenuTab'],
  };

  protected readonly rowSelection: RowSelectionOptions<OrderHistoryGridRow> = {
    mode: 'multiRow',
    checkboxes: true,
    headerCheckbox: true,
    enableClickSelection: false,
  };

  protected readonly columnDefs: ColDef<OrderHistoryGridRow>[] = [
    {
      headerName: 'STT',
      field: 'stt',
      flex: 0.5,
      minWidth: 70,
      maxWidth: 90,
      cellClass: 'cell-center cell-bold',
      filter: false,
      sortable: false,
    },
    {
      headerName: 'Bàn',
      field: 'tableName',
      minWidth: 120,
      flex: 1,
      cellClass: 'cell-bold',
    },
    {
      headerName: 'Nhân viên',
      field: 'employeeName',
      minWidth: 150,
      flex: 1.2,
    },
    {
      headerName: 'Trạng thái',
      field: 'orderStatus',
      minWidth: 130,
      flex: 1,
      cellRenderer: ({ value }: ICellRendererParams<OrderHistoryGridRow>) => {
        const status = value?.toString().toLowerCase() || '';
        let statusClass = 'status-default';
        if (status.includes('hoàn thành')) statusClass = 'status-completed';
        else if (status.includes('đã thanh toán')) statusClass = 'status-paid';
        else if (status.includes('đang')) statusClass = 'status-pending';
        else if (status.includes('hủy')) statusClass = 'status-cancelled';
        return `<span class="order-status ${statusClass}">${value || '-'}</span>`;
      },
    },
    {
      headerName: 'Ngày tạo',
      field: 'createdAtDisplay',
      minWidth: 140,
      flex: 1.1,
      cellClass: 'cell-compact',
    },
    {
      headerName: 'Ghi chú',
      field: 'note',
      minWidth: 150,
      flex: 1.5,
      valueFormatter: (p) => p.value || '—',
    },
    {
      headerName: 'Số lượng',
      field: 'totalQuantity',
      minWidth: 100,
      flex: 0.8,
      cellClass: 'cell-right cell-bold',
    },
    {
      headerName: 'Tổng tiền',
      field: 'totalAmountDisplay',
      minWidth: 130,
      flex: 1,
      cellClass: 'cell-right cell-bold',
    },
  ];

  protected onGridReady(event: GridReadyEvent<OrderHistoryGridRow>): void {
    this.gridApi = event.api;
    this.fitGridWidth();
  }

  protected onGridSizeChanged(_event: GridSizeChangedEvent<OrderHistoryGridRow>): void {
    this.fitGridWidth();
  }

  protected previousPage(): void {
    if (this.isBulkUpdating) return;
    const current = this.querySubject.value;
    if (current.page > 1) {
      this.querySubject.next({ ...current, page: current.page - 1 });
    }
  }

  protected nextPage(): void {
    if (this.isBulkUpdating) return;
    const current = this.querySubject.value;
    this.querySubject.next({ ...current, page: current.page + 1 });
  }

  protected setPageSize(size: number): void {
    if (this.isBulkUpdating) return;
    if (!this.pageSizeOptions.includes(size as any)) return;
    const current = this.querySubject.value;
    if (current.limit === size) {
      this.openedDropdown = null;
      return;
    }
    this.openedDropdown = null;
    this.querySubject.next({ page: 1, limit: size, filters: current.filters });
  }

  protected toggleDropdown(target: 'status' | 'pageSize', event?: Event): void {
    if (this.isBulkUpdating) return;
    event?.stopPropagation();
    this.advancedSearchOpen = false;
    this.openedDropdown = this.openedDropdown === target ? null : target;
  }

  protected toggleAdvancedSearch(): void {
    if (this.isBulkUpdating) return;
    this.openedDropdown = null;
    this.advancedSearchOpen = !this.advancedSearchOpen;
  }

  @HostListener('document:click')
  protected closeDropdown(): void {
    this.openedDropdown = null;
  }

  protected canGoPrevious(state: OrderHistoryViewState | null): boolean {
    return !!state && state.currentPage > 1 && !state.isLoading && !this.isBulkUpdating;
  }

  protected canGoNext(state: OrderHistoryViewState | null): boolean {
    return (
      !!state && state.currentPage < state.totalPages && !state.isLoading && !this.isBulkUpdating
    );
  }

  protected pageSummary(state: OrderHistoryViewState | null): string {
    return state ? `Trang ${state.currentPage}/${state.totalPages}` : 'Trang 1/1';
  }

  protected onFilterChange(): void {
    this.filterChanged$.next();
  }

  protected applySearch(): void {
    if (this.isBulkUpdating) return;
    const current = this.querySubject.value;
    this.querySubject.next({
      page: 1,
      limit: current.limit,
      filters: { ...this.filters },
    });
  }

  protected resetSearch(): void {
    if (this.isBulkUpdating) return;
    this.filters.tableName = '';
    this.filters.employeeName = '';
    this.filters.status = '';
    this.filters.sortField = 'createdAt';
    this.filters.sortDir = 'desc';
    this.advancedSearchOpen = false;
    this.applySearch();
  }

  protected close(): void {
    this.dialogContext?.completeWith();
    this.closed.emit();
  }

  protected displayTableName(state: OrderHistoryViewState | null): string {
    if (this.initialTableName) return this.initialTableName;
    const first = state?.rowData[0]?.tableName;
    return first ? `Bàn: ${first}` : 'Tất cả bàn';
  }

  private fetchState(
    page: number,
    limit: number,
    filters: OrderHistoryFilters,
  ): Observable<OrderHistoryViewState> {
    const request: OrderHistorySearchRequest = {
      page: page - 1,
      limit,
      diningTableId: this.tableId ?? undefined,
      tableName: filters.tableName?.trim() || undefined,
      employeeName: filters.employeeName?.trim() || undefined,
      status: filters.status || undefined,
      sortField: filters.sortField,
      sortDir: filters.sortDir,
    };

    return this.orderHistoryService.search(request).pipe(
      map((response: OrderHistorySearchResponse) => {
        const data = response.data;
        const rows = data.rows || [];
        const mappedRows = rows.map((item, index) => this.toGridRow(item, index, page, limit));
        return {
          isLoading: false,
          error: null,
          rowData: mappedRows,
          currentPage: (data.pageNo ?? 0) + 1,
          pageSize: data.pageSize,
          totalElements: data.totalElements,
          totalPages: data.totalPages,
        };
      }),
      startWith({
        isLoading: true,
        error: null,
        rowData: [],
        currentPage: page,
        pageSize: limit,
        totalElements: 0,
        totalPages: 1,
      }),
      catchError((err) => {
        console.error(err);
        return of({
          isLoading: false,
          error: 'Không thể tải lịch sử đặt món.',
          rowData: [],
          currentPage: page,
          pageSize: limit,
          totalElements: 0,
          totalPages: 1,
        });
      }),
    );
  }

  private toGridRow(
    item: OrderHistoryItem,
    index: number,
    page: number,
    pageSize: number,
  ): OrderHistoryGridRow {
    return {
      ...item,
      stt: (page - 1) * pageSize + index + 1,
      createdAtDisplay: this.formatDateTime(item.createdAt),
      totalAmountDisplay: this.formatCurrency(item.totalAmount),
    };
  }

  private formatDateTime(value: string): string {
    if (!value) return '-';
    const d = new Date(value);
    return isNaN(d.getTime())
      ? value
      : d.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  }

  private resolveTableId(data: TableIdInput | null | undefined): number | null {
    if (typeof data === 'number') return data;
    if (data && typeof data === 'object') return data.tableId;
    return null;
  }

  private resolveTableName(data: TableIdInput | null | undefined): string {
    if (data && typeof data === 'object' && data.tableName) return data.tableName;
    return '';
  }

  private fitGridWidth(): void {
    if (!this.gridApi) return;
    if (this.fitGridRafId) cancelAnimationFrame(this.fitGridRafId);
    this.fitGridRafId = requestAnimationFrame(() => {
      this.fitGridRafId = null;
      this.gridApi!.sizeColumnsToFit({ defaultMinWidth: 80 });
    });
  }
}
