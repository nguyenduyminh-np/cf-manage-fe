import { AsyncPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  Injector,
  OnDestroy,
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
import { TuiButton, TuiDialogService } from '@taiga-ui/core';
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

import { UiSelectComponent } from '../../shared/components/ui-component/ui-select/ui-select';

import {
  PurchaseOrderListItem,
  PurchaseOrderSearchRequest,
  PurchaseOrderCreateRequest,
  PurchaseOrderUpdateRequest,
  PurchaseOrderDetail,
} from '../../core/models/purchase-order/purchase-order.model';
import { PurchaseOrderService } from '../../core/services/purchase-order/purchase-order.model';
import { PurchaseOrderFormDialog } from '../../shared/components/dialogs/purchase-order-form-dialog/purchase-order-form-dialog';
import { downloadBlobFile } from '../../shared/utils/file-download.utils';
import {
  PurchaseOrderDetailDialog,
  PurchaseOrderDetailDialogOutput,
} from '../../shared/components/dialogs/purchase-order-detail-dialog/purchase-order-detail-dialog';

// ── View state ──────────────────────────────────────────────────────────────
interface PageViewState<T> {
  isLoading: boolean;
  error: string | null;
  rowData: T[];
  currentPage: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
}

// ── Search filters ─────────────────────────────────────────────────────────
interface PoSearchFilters {
  purchaseOrderCode: string;
  paymentStatus: string;
  totalPriceFrom: string;
  totalPriceTo: string;
  fromDate: string;
  toDate: string;
}

interface PoQuery {
  page: number;
  limit: number;
  sortField?: string;
  sortDir?: string;
  filters: PoSearchFilters;
}

// ── Status config ──────────────────────────────────────────────────────────
const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Nháp',
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};

@Component({
  standalone: true,
  selector: 'app-purchase-order',
  imports: [AsyncPipe, AgGridAngular, FormsModule, TuiButton, UiSelectComponent],
  templateUrl: './purchase-order.html',
  styleUrl: './purchase-order.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PurchaseOrder implements OnDestroy {
  private readonly poService = inject(PurchaseOrderService);
  private readonly dialogService = inject(TuiDialogService);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);

  // ── RAF & debounce ────────────────────────────────────────────────────────
  private gridFitRafId: number | null = null;
  private debounceId: number | null = null;
  private readonly DEBOUNCE_MS = 500;
  protected readonly isExporting = signal(false);

  private cancelRaf(): void {
    if (this.gridFitRafId !== null) {
      cancelAnimationFrame(this.gridFitRafId);
      this.gridFitRafId = null;
    }
  }

  ngOnDestroy(): void {
    this.cancelRaf();
  }

  // ── Filter options ────────────────────────────────────────────────────────
  protected readonly statusFilterOptions = [
    { label: 'Tất cả', value: '' },
    { label: 'Nháp', value: 'DRAFT' },
    { label: 'Chờ duyệt', value: 'PENDING' },
    { label: 'Đã duyệt', value: 'APPROVED' },
    { label: 'Hoàn thành', value: 'COMPLETED' },
    { label: 'Đã hủy', value: 'CANCELLED' },
  ];
  protected readonly pageSizeOptions = [10, 20, 50];

  protected readonly pageSizeSelectOptions = [
    { label: '10', value: 10 },
    { label: '20', value: 20 },
    { label: '50', value: 50 },
  ] as const;

  // ── Query subject ─────────────────────────────────────────────────────────
  private readonly querySubject = new BehaviorSubject<PoQuery>({
    page: 0,
    limit: 20,
    sortField: 'createdTime',
    sortDir: 'desc',
    filters: {
      purchaseOrderCode: '',
      paymentStatus: '',
      totalPriceFrom: '',
      totalPriceTo: '',
      fromDate: '',
      toDate: '',
    },
  });

  protected readonly state$: Observable<PageViewState<PurchaseOrderListItem>> =
    this.querySubject.pipe(
      switchMap((q) => this.fetchOrders(q)),
      tap((s) => (this.latestState = s)),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

  private latestState: PageViewState<PurchaseOrderListItem> | null = null;
  private gridApi: GridApi<PurchaseOrderListItem> | null = null;

  protected searchFilters: PoSearchFilters = {
    purchaseOrderCode: '',
    paymentStatus: '',
    totalPriceFrom: '',
    totalPriceTo: '',
    fromDate: '',
    toDate: '',
  };

  // ── Column defs ───────────────────────────────────────────────────────────
  protected readonly columnDefs: ColDef<PurchaseOrderListItem>[] = [
    {
      headerName: 'STT',
      valueGetter: (p: ValueGetterParams<PurchaseOrderListItem>) =>
        (p.node?.rowIndex ?? 0) +
        1 +
        (this.latestState?.currentPage ?? 0) * (this.latestState?.pageSize ?? 20),
      flex: 0.5,
      minWidth: 68,
      maxWidth: 88,
      pinned: 'left',
      sortable: false,
      filter: false,
      cellClass: 'cell-center cell-bold',
    },
    {
      headerName: 'Mã đơn',
      field: 'purchaseOrderCode',
      minWidth: 160,
      flex: 1.2,
      sortable: true,
      filter: true,
      valueFormatter: (p: ValueFormatterParams<PurchaseOrderListItem>) => p.value || '—',
      cellRenderer: (p: ICellRendererParams<PurchaseOrderListItem>) => {
        const code = p.data?.purchaseOrderCode ?? '—';
        return `<span class="po-code-cell">${code}</span>`;
      },
    },
    {
      headerName: 'Nhà cung cấp',
      field: 'supplierName',
      minWidth: 190,
      flex: 1.6,
      sortable: false,
      filter: false,
      valueFormatter: (p: ValueFormatterParams<PurchaseOrderListItem>) => p.value || '—',
    },
    {
      headerName: 'Tổng tiền',
      field: 'totalPrice',
      minWidth: 160,
      flex: 1.2,
      sortable: true,
      filter: false,
      cellClass: 'cell-bold cell-right',
      valueFormatter: (p: ValueFormatterParams<PurchaseOrderListItem>) => this.fmtCurrency(p.value),
    },
    {
      headerName: 'Trạng thái',
      field: 'paymentStatus',
      minWidth: 155,
      flex: 1.1,
      sortable: true,
      filter: false,
      cellRenderer: (p: ICellRendererParams<PurchaseOrderListItem>) => {
        const s = p.value ?? '';
        return `<span class="status-badge status-badge--${s.toLowerCase()}">${STATUS_LABEL[s] ?? s}</span>`;
      },
    },
    {
      headerName: 'Người tạo',
      field: 'accountFullName',
      minWidth: 160,
      flex: 1.2,
      sortable: false,
      filter: false,
      valueFormatter: (p: ValueFormatterParams<PurchaseOrderListItem>) => p.value || '—',
    },
    {
      headerName: 'Ngày tạo',
      field: 'createdTime',
      minWidth: 165,
      flex: 1.2,
      sortable: true,
      filter: false,
      valueFormatter: (p: ValueFormatterParams<PurchaseOrderListItem>) => this.fmtDT(p.value),
    },
    {
      headerName: 'Ngày nhận',
      field: 'orderDate',
      minWidth: 145,
      flex: 1.1,
      sortable: false,
      filter: false,
      valueFormatter: (p: ValueFormatterParams<PurchaseOrderListItem>) =>
        p.value ? this.fmtDate(p.value) : '—',
    },
    {
      headerName: 'Thao tác',
      colId: 'po-actions',
      cellRenderer: () =>
        `<span class="material-symbols-outlined action-icon action-icon--view" data-action="view" title="Xem chi tiết">visibility</span>` +
        `<span class="material-symbols-outlined action-icon action-icon--edit" data-action="edit" title="Chỉnh sửa">edit</span>`,
      width: 110,
      minWidth: 110,
      maxWidth: 130,
      flex: 0,
      pinned: 'right',
      lockPinned: true,
      suppressSizeToFit: true,
      sortable: false,
      filter: false,
      cellClass: 'cell-center cell-actions',
    },
  ];

  protected readonly defaultColDef: ColDef = { resizable: true, minWidth: 100, flex: 1 };

  // ── Grid events ───────────────────────────────────────────────────────────
  protected onGridReady(e: GridReadyEvent<PurchaseOrderListItem>): void {
    this.gridApi = e.api;
    this.fitGrid();
  }
  protected onGridSizeChanged(_e: GridSizeChangedEvent<PurchaseOrderListItem>): void {
    this.fitGrid();
  }
  private fitGrid(): void {
    const api = this.gridApi;
    if (!api) return;
    if (this.gridFitRafId !== null) cancelAnimationFrame(this.gridFitRafId);
    this.gridFitRafId = requestAnimationFrame(() => {
      this.gridFitRafId = null;
      api.sizeColumnsToFit({ defaultMinWidth: 80 });
    });
  }

  protected onCellClicked(e: CellClickedEvent<PurchaseOrderListItem>): void {
    if (e.colDef.colId !== 'po-actions' || !e.data) return;
    const action = (e.event?.target as HTMLElement)
      ?.closest('[data-action]')
      ?.getAttribute('data-action');
    if (action === 'view') this.openDetailDialog(e.data);
    else if (action === 'edit') this.openEditDialog(e.data);
  }

  protected onRowDoubleClicked(e: RowDoubleClickedEvent<PurchaseOrderListItem>): void {
    if (e.data) this.openDetailDialog(e.data);
  }

  // ── Search ────────────────────────────────────────────────────────────────
  protected applySearch(): void {
    const c = this.querySubject.getValue();
    this.querySubject.next({ ...c, page: 0, filters: { ...this.searchFilters } });
  }
  protected onFiltersChanged(): void {
    if (this.debounceId) clearTimeout(this.debounceId);
    this.debounceId = window.setTimeout(() => this.applySearch(), this.DEBOUNCE_MS);
  }

  protected setPaymentStatus(value: string | number | null): void {
    this.searchFilters.paymentStatus = (value ?? '') as string;
    this.onFiltersChanged();
  }
  protected resetSearch(): void {
    this.searchFilters = {
      purchaseOrderCode: '',
      paymentStatus: '',
      totalPriceFrom: '',
      totalPriceTo: '',
      fromDate: '',
      toDate: '',
    };
    this.applySearch();
  }

  protected exportExcel(): void {
    if (this.isExporting()) return;

    const q = this.querySubject.getValue();
    const request = this.buildSearchRequest(
      q,
      0,
      Math.max(1, this.latestState?.totalElements ?? q.limit),
    );

    this.isExporting.set(true);
    this.poService
      .exportExcel(request)
      .pipe(
        finalize(() => this.isExporting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (blob) => downloadBlobFile(blob, `DANH_SACH_DON_NHAP_HANG_${Date.now()}.xlsx`),
        error: (e) => console.error('Không thể xuất Excel danh sách đơn nhập hàng.', e),
      });
  }

  // ── Pagination ────────────────────────────────────────────────────────────
  protected setPageSize(value: string | number | null): void {
    const s = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(s)) return;
    const c = this.querySubject.getValue();
    if (c.limit === s) return;
    this.querySubject.next({ ...c, page: 0, limit: s });
  }
  protected prevPage(): void {
    const c = this.querySubject.getValue();
    if (c.page > 0) this.querySubject.next({ ...c, page: c.page - 1 });
  }
  protected nextPage(): void {
    const c = this.querySubject.getValue();
    if (this.latestState && c.page < this.latestState.totalPages - 1)
      this.querySubject.next({ ...c, page: c.page + 1 });
  }
  protected canPrev(s: PageViewState<PurchaseOrderListItem> | null): boolean {
    return !!s && s.currentPage > 0 && !s.isLoading;
  }
  protected canNext(s: PageViewState<PurchaseOrderListItem> | null): boolean {
    return !!s && s.currentPage < s.totalPages - 1 && !s.isLoading;
  }
  protected pageSummary(s: PageViewState<unknown> | null): string {
    if (!s) return 'Trang 1/1';
    return `Trang ${s.currentPage + 1}/${s.totalPages}`;
  }

  // ── Dialogs ───────────────────────────────────────────────────────────────
  protected openCreateDialog(): void {
    this.dialogService
      .open<PurchaseOrderCreateRequest | null>(
        new PolymorpheusComponent(PurchaseOrderFormDialog, this.injector),
        {
          data: { mode: 'create', order: null },
          size: 'auto',
          dismissible: true,
          closeable: false,
        },
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((payload) => {
        if (!payload) return;
        this.poService
          .create(payload as PurchaseOrderCreateRequest)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({ next: () => this.refresh(), error: (e) => console.error(e) });
      });
  }

  private openEditDialog(item: PurchaseOrderListItem): void {
    // Load full detail before opening edit dialog
    this.poService
      .getDetail(item.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          const detail: PurchaseOrderDetail = r.data;
          // Can't edit COMPLETED/CANCELLED
          if (detail.paymentStatus === 'COMPLETED' || detail.paymentStatus === 'CANCELLED') {
            this.openDetailDialog(item);
            return;
          }
          this.dialogService
            .open<PurchaseOrderUpdateRequest | null>(
              new PolymorpheusComponent(PurchaseOrderFormDialog, this.injector),
              {
                data: { mode: 'edit', order: detail },
                size: 'auto',
                dismissible: true,
                closeable: false,
              },
            )
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((payload) => {
              if (!payload) return;
              this.poService
                .update(payload as PurchaseOrderUpdateRequest)
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe({ next: () => this.refresh(), error: (e) => console.error(e) });
            });
        },
        error: (e) => console.error(e),
      });
  }

  private openDetailDialog(item: PurchaseOrderListItem): void {
    this.poService
      .getDetail(item.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.dialogService
            .open<PurchaseOrderDetailDialogOutput | null>(
              new PolymorpheusComponent(PurchaseOrderDetailDialog, this.injector),
              { data: { order: r.data }, size: 'auto', dismissible: true, closeable: false },
            )
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((result) => {
              if (result?.action === 'status') this.refresh();
            });
        },
        error: (e) => console.error(e),
      });
  }

  private refresh(): void {
    this.querySubject.next(this.querySubject.getValue());
  }

  // ── API fetch ─────────────────────────────────────────────────────────────
  private fetchOrders(q: PoQuery): Observable<PageViewState<PurchaseOrderListItem>> {
    return this.poService.search(this.buildSearchRequest(q)).pipe(
      map((r) => ({
        isLoading: false,
        error: null,
        rowData: r.data.rows,
        currentPage: r.data.pageNo,
        pageSize: r.data.pageSize,
        totalElements: r.data.totalElements,
        totalPages: r.data.totalPages,
      })),
      startWith({
        isLoading: true,
        error: null,
        rowData: [],
        currentPage: 0,
        pageSize: q.limit,
        totalElements: 0,
        totalPages: 1,
      }),
      catchError(() =>
        of({
          isLoading: false,
          error: 'Không thể tải danh sách đơn nhập hàng.',
          rowData: [],
          currentPage: 0,
          pageSize: q.limit,
          totalElements: 0,
          totalPages: 1,
        }),
      ),
    );
  }

  private buildSearchRequest(
    q: PoQuery,
    page: number = q.page,
    limit: number = q.limit,
  ): PurchaseOrderSearchRequest {
    const f = q.filters;

    return {
      page,
      limit,
      sortField: q.sortField,
      sortDir: q.sortDir,
      purchaseOrderCode: f.purchaseOrderCode || undefined,
      paymentStatus: f.paymentStatus || undefined,
      totalPriceFrom: f.totalPriceFrom ? +f.totalPriceFrom : undefined,
      totalPriceTo: f.totalPriceTo ? +f.totalPriceTo : undefined,
      fromDate: f.fromDate || undefined,
      toDate: f.toDate || undefined,
    };
  }

  // ── Formatters ────────────────────────────────────────────────────────────
  private fmtDT(iso: string): string {
    if (!iso) return '—';
    return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(
      new Date(iso),
    );
  }
  private fmtDate(iso: string): string {
    if (!iso) return '—';
    return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(new Date(iso));
  }
  private fmtCurrency(v: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);
  }
}
