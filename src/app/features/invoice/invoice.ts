import { AsyncPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  Injector,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AgGridAngular } from 'ag-grid-angular';
import {
  CellClickedEvent,
  ColDef,
  GridApi,
  GridReadyEvent,
  GridSizeChangedEvent,
  ICellRendererParams,
  RowDoubleClickedEvent,
  ValueFormatterParams,
  ValueGetterParams,
} from 'ag-grid-community';
import { TuiAlertService, TuiDialogService } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import {
  BehaviorSubject,
  catchError,
  finalize,
  map,
  Observable,
  of,
  shareReplay,
  startWith,
  switchMap,
  tap,
} from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { InvoiceListItem, InvoiceSearchRequest } from '../../core/models/invoice/invoice.model';
import { InvoiceService } from '../../core/services/invoice/invoice.service';
import {
  InvoiceDetailDialog,
  InvoiceDetailDialogInput,
} from '../../shared/components/dialogs/invoice/invoice-detail-dialog/invoice-detail-dialog';
import { UiSelectComponent } from '../../shared/components/ui-component/ui-select/ui-select';
import { BreadcrumbComponent } from '../../shared/components/ui-component/breadcrumb/breadcrumb';
import { downloadBlobFile } from '../../shared/utils/file-download.utils';

// ----- View State -----
interface InvoiceViewState {
  isLoading: boolean;
  error: string | null;
  rowData: InvoiceListItem[];
  currentPage: number; // 0‑based
  pageSize: number;
  totalElements: number;
  totalPages: number;
}

// ----- Filters -----
interface InvoiceSearchFilters {
  invoiceCode: string;
  paymentStatus: string;
  paymentMethod: string;
  totalAmountFrom: number | null;
  totalAmountTo: number | null;
}

// ----- Query Object -----
interface InvoiceQuery {
  page: number;
  limit: number;
  sortField?: string;
  sortDir?: string;
  filters: InvoiceSearchFilters;
}

@Component({
  standalone: true,
  selector: 'app-invoice',
  imports: [AsyncPipe, AgGridAngular, FormsModule, UiSelectComponent, BreadcrumbComponent],
  templateUrl: './invoice.html',
  styleUrl: './invoice.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Invoice {
  private readonly invoiceService = inject(InvoiceService);
  private readonly dialogService = inject(TuiDialogService);
  private readonly alertService = inject(TuiAlertService);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly isExporting = signal(false);

  // ---- Reactive Query Hub ----
  private readonly querySubject = new BehaviorSubject<InvoiceQuery>({
    page: 0,
    limit: 20,
    sortField: 'createdAt',
    sortDir: 'desc',
    filters: {
      invoiceCode: '',
      paymentStatus: '',
      paymentMethod: '',
      totalAmountFrom: null,
      totalAmountTo: null,
    },
  });

  // ---- View State Stream ----
  protected readonly detailState$: Observable<InvoiceViewState> = this.querySubject.pipe(
    switchMap((query) => this.fetchInvoices(query)),
    tap((state) => (this.latestState = state)),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  private latestState: InvoiceViewState | null = null;
  private gridApi: GridApi<InvoiceListItem> | null = null;
  private fitGridRafId: number | null = null;

  // ---- Filter Form Model ----
  protected searchFilters: InvoiceSearchFilters = {
    invoiceCode: '',
    paymentStatus: '',
    paymentMethod: '',
    totalAmountFrom: null,
    totalAmountTo: null,
  };

  // Options
  protected readonly paymentStatusOptions = [
    { label: 'Tất cả', value: '' },
    { label: 'Đã thanh toán', value: 'PAID' },
    { label: 'Chờ thanh toán', value: 'PENDING' },
  ];
  protected readonly paymentMethodOptions = [
    { label: 'Tất cả', value: '' },
    { label: 'Chuyển khoản', value: 'BANK' },
    { label: 'Tiền mặt', value: 'CASH' },
  ];
  protected readonly pageSizeOptions = [10, 20, 50];

  // ---- Debounce Timer ----
  private filterDebounceTimerId: number | null = null;
  private readonly FILTER_DEBOUNCE_MS = 500;

  // ---- Column Definitions ----
  protected readonly columnDefs: ColDef<InvoiceListItem>[] = [
    {
      headerName: 'STT',
      valueGetter: (params: ValueGetterParams<InvoiceListItem>) =>
        (params.node?.rowIndex ?? 0) +
        1 +
        (this.latestState?.currentPage ?? 0) * (this.latestState?.pageSize ?? 20),
      flex: 0.55,
      minWidth: 72,
      maxWidth: 90,
      pinned: 'left',
      sortable: false,
      filter: false,
      cellClass: 'cell-center cell-bold',
    },
    {
      headerName: 'Mã hóa đơn',
      field: 'invoiceCode',
      minWidth: 160,
      flex: 1.2,
      sortable: true,
      filter: true,
      cellRenderer: (params: ICellRendererParams<InvoiceListItem>) => {
        const code = params.data?.invoiceCode ?? '—';
        return `<span class="inv-code-cell">${code}</span>`;
      },
    },
    {
      headerName: 'Tổng tiền',
      field: 'totalAmount',
      valueFormatter: (params: ValueFormatterParams<InvoiceListItem>) =>
        this.formatCurrency(params.value),
      minWidth: 140,
      flex: 1.1,
      cellClass: 'cell-right cell-bold',
      sortable: true,
      filter: 'agNumberColumnFilter',
    },
    {
      headerName: 'Trạng thái',
      field: 'paymentStatus',
      minWidth: 170,
      flex: 1.2,
      cellRenderer: (params: ICellRendererParams<InvoiceListItem>) => {
        const status = params.value;
        const isPaid = status === 'PAID' || status === 'Đã thanh toán';
        const isPending = status === 'PENDING' || status === 'Chờ thanh toán';

        const label = isPaid ? 'Đã thanh toán' : isPending ? 'Chờ thanh toán' : status;
        const cssClass = isPaid
          ? 'invoice-status--paid'
          : isPending
            ? 'invoice-status--pending'
            : 'invoice-status--default';
        return `<span class="invoice-status ${cssClass}">${label}</span>`;
      },
      sortable: true,
      filter: true,
    },
    {
      headerName: 'Phương thức',
      minWidth: 150,
      flex: 1.1,
      valueGetter: (params: ValueGetterParams<InvoiceListItem>) => {
        switch (params.data?.paymentMethod) {
          case 'BANK':
          case 'Chuyển khoản':
            return 'Chuyển khoản';
          case 'CASH':
          case 'Tiền mặt':
            return 'Tiền mặt';
          default:
            return params.data?.paymentMethod || '-';
        }
      },
      sortable: true,
      filter: true,
    },
    {
      headerName: 'Người tạo',
      field: 'fullName',
      minWidth: 150,
      flex: 1.2,
      sortable: true,
      filter: true,
    },
    {
      headerName: 'Ngày tạo',
      field: 'createdAt',
      minWidth: 160,
      flex: 1.2,
      valueFormatter: (params: ValueFormatterParams<InvoiceListItem>) =>
        this.formatDateTime(params.value),
      sortable: true,
      filter: 'agDateColumnFilter',
    },
    {
      headerName: 'Mã đơn đặt',
      field: 'bookingInvoiceCode',
      minWidth: 150,
      flex: 1.2,
      sortable: true,
      filter: true,
      cellRenderer: (params: ICellRendererParams<InvoiceListItem>) => {
        const code = params.data?.bookingInvoiceCode;
        if (!code) return '<span>-</span>';
        return `<span class="inv-code-cell">${code}</span>`;
      },
    },
    {
      headerName: 'Thao tác',
      colId: 'inv-actions',
      cellRenderer: () =>
        `<span class="material-symbols-outlined action-icon action-icon--view" data-action="view" title="Xem chi tiết">visibility</span>`,
      width: 90,
      minWidth: 90,
      maxWidth: 110,
      flex: 0,
      pinned: 'right',
      lockPinned: true,
      suppressSizeToFit: true,
      sortable: false,
      filter: false,
      cellClass: 'cell-center cell-actions',
    },
  ];

  protected readonly defaultColDef: ColDef<InvoiceListItem> = {
    resizable: true,
    minWidth: 100,
    flex: 1,
  };

  // -------------------------
  // Grid Events
  // -------------------------
  protected onGridReady(event: GridReadyEvent<InvoiceListItem>): void {
    this.gridApi = event.api;
    this.fitGridWidth();
  }

  protected onGridSizeChanged(_event: GridSizeChangedEvent<InvoiceListItem>): void {
    this.fitGridWidth();
  }

  private fitGridWidth(): void {
    const gridApi = this.gridApi;
    if (!gridApi) return;

    if (this.fitGridRafId !== null) {
      cancelAnimationFrame(this.fitGridRafId);
    }

    this.fitGridRafId = requestAnimationFrame(() => {
      this.fitGridRafId = null;
      gridApi.sizeColumnsToFit({ defaultMinWidth: 80 });
    });
  }

  protected onCellClicked(event: CellClickedEvent<InvoiceListItem>): void {
    if (event.colDef.colId !== 'inv-actions' || !event.data) return;
    const action = (event.event?.target as HTMLElement)
      ?.closest('[data-action]')
      ?.getAttribute('data-action');
    if (action === 'view') this.openDetail(event.data.id);
  }

  protected onRowDoubleClicked(event: RowDoubleClickedEvent<InvoiceListItem>): void {
    if (event.data) {
      this.openDetail(event.data.id);
    }
  }

  // -------------------------
  // Search & Filter Actions
  // -------------------------
  protected applySearch(): void {
    const current = this.querySubject.getValue();
    this.querySubject.next({
      ...current,
      page: 0, // reset về trang đầu
      filters: { ...this.searchFilters },
    });
  }

  protected onFiltersChanged(): void {
    if (this.filterDebounceTimerId) clearTimeout(this.filterDebounceTimerId);
    this.filterDebounceTimerId = window.setTimeout(() => {
      this.applySearch();
    }, this.FILTER_DEBOUNCE_MS);
  }

  protected resetSearch(): void {
    this.searchFilters = {
      invoiceCode: '',
      paymentStatus: '',
      paymentMethod: '',
      totalAmountFrom: null,
      totalAmountTo: null,
    };
    this.applySearch();
  }

  protected setPaymentStatus(value: string | number | null): void {
    this.searchFilters.paymentStatus = typeof value === 'string' ? value : '';
    this.onFiltersChanged();
  }

  protected setPaymentMethod(value: string | number | null): void {
    this.searchFilters.paymentMethod = typeof value === 'string' ? value : '';
    this.onFiltersChanged();
  }

  protected exportExcel(): void {
    if (this.isExporting()) {
      return;
    }

    this.isExporting.set(true);
    this.invoiceService
      .exportExcel(this.buildSearchRequest(this.querySubject.getValue()))
      .pipe(
        finalize(() => this.isExporting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (blob) =>
          downloadBlobFile(blob, `DANH_SACH_HOA_DON_${Date.now()}.xlsx`, this.alertService),
        error: (error) =>
          this.alertService
            .open('Không thể xuất Excel danh sách hóa đơn. Vui lòng thử lại.', {
              appearance: 'error',
            })
            .subscribe(),
      });
  }

  // -------------------------
  // Pagination
  // -------------------------
  protected setPageSize(newSize: number): void {
    if (!this.pageSizeOptions.includes(newSize)) return;
    const current = this.querySubject.getValue();
    if (current.limit === newSize) return;
    this.querySubject.next({ ...current, page: 0, limit: newSize });
  }

  protected previousPage(): void {
    const current = this.querySubject.getValue();
    if (current.page > 0) {
      this.querySubject.next({ ...current, page: current.page - 1 });
    }
  }

  protected nextPage(): void {
    const current = this.querySubject.getValue();
    if (this.latestState && current.page < this.latestState.totalPages - 1) {
      this.querySubject.next({ ...current, page: current.page + 1 });
    }
  }

  protected canGoPrevious(state: InvoiceViewState | null): boolean {
    return !!state && state.currentPage > 0 && !state.isLoading;
  }

  protected canGoNext(state: InvoiceViewState | null): boolean {
    return !!state && state.currentPage < state.totalPages - 1 && !state.isLoading;
  }

  protected pageSummary(state: InvoiceViewState | null): string {
    if (!state) return 'Trang 1/1';
    return `Trang ${state.currentPage + 1}/${state.totalPages}`;
  }

  // -------------------------
  // Detail Dialog
  // -------------------------
  private openDetail(invoiceId: number): void {
    // Gọi API getDetail trước
    this.invoiceService
      .getDetail(invoiceId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (response?.data) {
            const dialogData: InvoiceDetailDialogInput = { invoiceData: response.data };
            this.dialogService
              .open<boolean | null>(new PolymorpheusComponent(InvoiceDetailDialog, this.injector), {
                data: dialogData,
                size: 'auto',
                dismissible: true,
                closeable: false,
              })
              .subscribe((result) => {
                // Nếu result là true => đã in hóa đơn, có thể thực hiện hành động gì đó
                if (result === true) {
                  // Ví dụ: refresh grid
                  this.querySubject.next(this.querySubject.getValue());
                }
              });
          }
        },
        error: () => {
          // Xử lý lỗi nếu không lấy được chi tiết (có thể hiển thị toast)
          console.error('Không thể tải chi tiết hóa đơn');
        },
      });
  }

  // -------------------------
  // Placeholder cho nút Tạo mới
  // -------------------------
  protected createInvoice(): void {
    // TODO: mở dialog tạo hóa đơn
    console.log('Tạo hóa đơn mới');
  }

  // -------------------------
  // API Call
  // -------------------------
  private fetchInvoices(query: InvoiceQuery): Observable<InvoiceViewState> {
    const request = this.buildSearchRequest(query);

    return this.invoiceService.search(request).pipe(
      map((response) => ({
        isLoading: false,
        error: null,
        rowData: response.data.rows,
        currentPage: response.data.pageNo, // 0‑based
        pageSize: response.data.pageSize,
        totalElements: response.data.totalElements,
        totalPages: response.data.totalPages,
      })),
      startWith({
        isLoading: true,
        error: null,
        rowData: [],
        currentPage: 0,
        pageSize: query.limit,
        totalElements: 0,
        totalPages: 1,
      }),
      catchError(() =>
        of({
          isLoading: false,
          error: 'Không thể tải danh sách hóa đơn.',
          rowData: [],
          currentPage: 0,
          pageSize: query.limit,
          totalElements: 0,
          totalPages: 1,
        }),
      ),
    );
  }

  private buildSearchRequest(query: InvoiceQuery): InvoiceSearchRequest {
    return {
      page: query.page,
      limit: query.limit,
      sortField: query.sortField,
      sortDir: query.sortDir,
      invoiceCode: query.filters.invoiceCode || undefined,
      paymentStatus: query.filters.paymentStatus || undefined,
      paymentMethod: query.filters.paymentMethod || undefined,
      totalAmountFrom: query.filters.totalAmountFrom ?? undefined,
      totalAmountTo: query.filters.totalAmountTo ?? undefined,
    };
  }

  // -------------------------
  // Formatters
  // -------------------------
  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  }

  private formatDateTime(isoString: string): string {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(
      date,
    );
  }
}
