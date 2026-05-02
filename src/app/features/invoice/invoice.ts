import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, Injector } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AgGridAngular } from 'ag-grid-angular';
import {
  CellClickedEvent,
  ColDef,
  GridApi,
  GridReadyEvent,
  ICellRendererParams,
  RowDoubleClickedEvent,
  ValueFormatterParams,
  ValueGetterParams,
} from 'ag-grid-community';
import { TuiButton, TuiDialogService } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import {
  BehaviorSubject,
  catchError,
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
} from '../../shared/components/dialogs/invoice-detail-dialog/invoice-detail-dialog';

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
  imports: [AsyncPipe, AgGridAngular, FormsModule, TuiButton],
  templateUrl: './invoice.html',
  styleUrl: './invoice.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Invoice {
  private readonly invoiceService = inject(InvoiceService);
  private readonly dialogService = inject(TuiDialogService);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);

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
      width: 70,
      sortable: false,
      filter: false,
      cellClass: 'cell-center',
    },
    { headerName: 'Mã hóa đơn', field: 'invoiceCode', sortable: true, filter: true },
    {
      headerName: 'Tổng tiền',
      field: 'totalAmount',
      valueFormatter: (params: ValueFormatterParams<InvoiceListItem>) =>
        this.formatCurrency(params.value),
      cellClass: 'cell-right',
      sortable: true,
      filter: 'agNumberColumnFilter',
    },
    {
      headerName: 'Trạng thái',
      field: 'paymentStatus',
      cellRenderer: (params: ICellRendererParams<InvoiceListItem>) => {
        const status = params.value;
        const label =
          status === 'PAID' ? 'Đã thanh toán' : status === 'PENDING' ? 'Chờ thanh toán' : status;
        const cssClass = status === 'PAID' ? 'invoice-status--paid' : 'invoice-status--pending';
        return `<span class="invoice-status ${cssClass}">${label}</span>`;
      },
      sortable: true,
      filter: true,
    },
    {
      headerName: 'Phương thức',
      valueGetter: (params: ValueGetterParams<InvoiceListItem>) => {
        switch (params.data?.paymentMethod) {
          case 'BANK':
            return 'Chuyển khoản';
          case 'CASH':
            return 'Tiền mặt';
          default:
            return params.data?.paymentMethod;
        }
      },
      sortable: true,
      filter: true,
    },
    { headerName: 'Người tạo', field: 'fullName', sortable: true, filter: true },
    {
      headerName: 'Ngày tạo',
      field: 'createdAt',
      valueFormatter: (params: ValueFormatterParams<InvoiceListItem>) =>
        this.formatDateTime(params.value),
      sortable: true,
      filter: 'agDateColumnFilter',
    },
    {
      headerName: 'Mã booking',
      field: 'bookingInvoiceCode',
      valueFormatter: (params: ValueFormatterParams<InvoiceListItem>) => params.value || '-',
      sortable: true,
      filter: true,
    },
    {
      headerName: 'Thao tác',
      colId: 'actions',
      cellRenderer: () => `<span class="material-symbols-outlined">visibility</span>`,
      width: 80,
      sortable: false,
      filter: false,
      cellClass: 'cell-center cell-clickable',
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
  }

  protected onCellClicked(event: CellClickedEvent<InvoiceListItem>): void {
    if (event.colDef.colId === 'actions' && event.data) {
      this.openDetail(event.data.id);
    }
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
    const request: InvoiceSearchRequest = {
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
