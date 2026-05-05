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
import { TuiDialogService } from '@taiga-ui/core';
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

import {
  SupplierListItem,
  SupplierSearchRequest,
  SupplierCreateRequest,
  SupplierUpdateRequest,
} from '../../core/models/supplier/supplier.model';
import { SupplierService } from '../../core/services/supplier/supplier.service';
import { SupplierFormDialog } from '../../shared/components/dialogs/supplier-form-dialog/supplier-form-dialog';
import { SupplierDeleteDialog } from '../../shared/components/dialogs/supplier-delete-dialog/supplier-delete-dialog';
import { UiSelectComponent } from '../../shared/components/ui-component/ui-select/ui-select';

// ── View state ────────────────────────────────────────────────────────────────
interface PageViewState<T> {
  isLoading: boolean;
  error: string | null;
  rowData: T[];
  currentPage: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
}

// ── Filters ───────────────────────────────────────────────────────────────────
interface SupplierSearchFilters {
  supplierCode: string;
  supplierName: string;
  contactInfo: string;
  isActive: string | null;
}

interface SupplierQuery {
  page: number;
  limit: number;
  sortField?: string;
  sortDir?: string;
  filters: SupplierSearchFilters;
}

@Component({
  standalone: true,
  selector: 'app-supplier',
  imports: [AsyncPipe, AgGridAngular, FormsModule, UiSelectComponent],
  templateUrl: './supplier.html',
  styleUrl: './supplier.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Supplier implements OnDestroy {
  private readonly supplierService = inject(SupplierService);
  private readonly dialogService = inject(TuiDialogService);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);

  // ── RAF & debounce ────────────────────────────────────────────────────────
  private fitRafId: number | null = null;
  private debounceId: number | null = null;
  private readonly DEBOUNCE_MS = 500;
  protected readonly isExporting = signal(false);

  private cancelRaf(): void {
    if (this.fitRafId !== null) {
      cancelAnimationFrame(this.fitRafId);
      this.fitRafId = null;
    }
  }

  ngOnDestroy(): void {
    this.cancelRaf();
  }

  // ── Filter options ────────────────────────────────────────────────────────
  protected readonly activeStatusOptions = [
    { label: 'Tất cả', value: null },
    { label: 'Đang hoạt động', value: 'true' },
    { label: 'Ngừng hoạt động', value: 'false' },
  ] as const;

  protected readonly pageSizeSelectOptions = [
    { label: '10', value: 10 },
    { label: '20', value: 20 },
    { label: '50', value: 50 },
  ] as const;

  // ── Query subject ─────────────────────────────────────────────────────────
  private readonly querySubject = new BehaviorSubject<SupplierQuery>({
    page: 0,
    limit: 20,
    sortField: 'createdTime',
    sortDir: 'desc',
    filters: { supplierCode: '', supplierName: '', contactInfo: '', isActive: null },
  });

  protected readonly state$: Observable<PageViewState<SupplierListItem>> = this.querySubject.pipe(
    switchMap((q) => this.fetchSuppliers(q)),
    tap((s) => (this.latestState = s)),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  private latestState: PageViewState<SupplierListItem> | null = null;
  private gridApi: GridApi<SupplierListItem> | null = null;

  protected searchFilters: SupplierSearchFilters = {
    supplierCode: '',
    supplierName: '',
    contactInfo: '',
    isActive: null,
  };

  // ── Column defs ───────────────────────────────────────────────────────────
  protected readonly columnDefs: ColDef<SupplierListItem>[] = [
    {
      headerName: 'STT',
      valueGetter: (p: ValueGetterParams<SupplierListItem>) =>
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
      headerName: 'Mã nhà cung cấp',
      field: 'supplierCode',
      minWidth: 175,
      flex: 1.2,
      sortable: true,
      filter: true,
      valueFormatter: (p: ValueFormatterParams<SupplierListItem>) => p.value || '—',
      cellRenderer: (p: ICellRendererParams<SupplierListItem>) => {
        const code = p.data?.supplierCode ?? '—';
        return `<span class="sup-code-cell">${code}</span>`;
      },
    },
    {
      headerName: 'Tên nhà cung cấp',
      field: 'supplierName',
      minWidth: 220,
      flex: 2,
      sortable: true,
      filter: true,
    },
    {
      headerName: 'Liên hệ',
      field: 'contactInfo',
      minWidth: 180,
      flex: 1.5,
      sortable: false,
      filter: false,
      valueFormatter: (p: ValueFormatterParams<SupplierListItem>) => p.value || '—',
    },
    {
      headerName: 'Địa chỉ',
      field: 'address',
      minWidth: 200,
      flex: 1.8,
      sortable: false,
      filter: false,
      valueFormatter: (p: ValueFormatterParams<SupplierListItem>) => p.value || '—',
    },
    {
      headerName: 'Trạng thái',
      field: 'active',
      minWidth: 170,
      flex: 1.1,
      sortable: false,
      filter: false,
      cellRenderer: (p: ICellRendererParams<SupplierListItem>) => {
        const ok = p.value === true;
        return `<span class="status-badge status-badge--${ok ? 'active' : 'inactive'}">${ok ? 'Đang hoạt động' : 'Ngừng hoạt động'}</span>`;
      },
    },
    {
      headerName: 'Ngày tạo',
      field: 'createdTime',
      minWidth: 160,
      flex: 1.2,
      sortable: true,
      filter: false,
      valueFormatter: (p: ValueFormatterParams<SupplierListItem>) => this.fmtDT(p.value),
    },
    {
      headerName: 'Thao tác',
      colId: 'sup-actions',
      cellRenderer: () =>
        `<span class="material-symbols-outlined action-icon action-icon--edit"   data-action="edit"   title="Chỉnh sửa">edit</span>` +
        `<span class="material-symbols-outlined action-icon action-icon--delete" data-action="delete" title="Xóa">delete</span>`,
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
  protected onGridReady(e: GridReadyEvent<SupplierListItem>): void {
    this.gridApi = e.api;
    this.fitGrid();
  }
  protected onGridSizeChanged(_e: GridSizeChangedEvent<SupplierListItem>): void {
    this.fitGrid();
  }
  private fitGrid(): void {
    const api = this.gridApi;
    if (!api) return;
    if (this.fitRafId !== null) cancelAnimationFrame(this.fitRafId);
    this.fitRafId = requestAnimationFrame(() => {
      this.fitRafId = null;
      api.sizeColumnsToFit({ defaultMinWidth: 80 });
    });
  }

  protected onCellClicked(e: CellClickedEvent<SupplierListItem>): void {
    if (e.colDef.colId !== 'sup-actions' || !e.data) return;
    const action = (e.event?.target as HTMLElement)
      ?.closest('[data-action]')
      ?.getAttribute('data-action');
    if (action === 'edit') this.openEditDialog(e.data);
    else if (action === 'delete') this.openDeleteDialog(e.data);
  }

  protected onRowDoubleClicked(e: RowDoubleClickedEvent<SupplierListItem>): void {
    if (e.data) this.openEditDialog(e.data);
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
  protected setActiveStatus(value: string | number | null): void {
    this.searchFilters.isActive = value as string | null;
    this.onFiltersChanged();
  }
  protected resetSearch(): void {
    this.searchFilters = { supplierCode: '', supplierName: '', contactInfo: '', isActive: null };
    this.applySearch();
  }

  protected exportExcel(): void {
    if (this.isExporting()) return;

    const q = this.querySubject.getValue();
    const request = this.buildSearchRequest({
      ...q,
      page: 0,
      limit: this.latestState?.totalElements || q.limit,
    });

    this.isExporting.set(true);
    this.supplierService
      .exportExcel(request)
      .pipe(
        finalize(() => this.isExporting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (blob) => this.downloadExcel(blob),
        error: (e) => console.error('Không thể xuất Excel danh sách nhà cung cấp.', e),
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
  protected canPrev(s: PageViewState<SupplierListItem> | null): boolean {
    return !!s && s.currentPage > 0 && !s.isLoading;
  }
  protected canNext(s: PageViewState<SupplierListItem> | null): boolean {
    return !!s && s.currentPage < s.totalPages - 1 && !s.isLoading;
  }
  protected pageSummary(s: PageViewState<unknown> | null): string {
    if (!s) return 'Trang 1/1';
    return `Trang ${s.currentPage + 1}/${s.totalPages}`;
  }

  // ── Dialogs ───────────────────────────────────────────────────────────────
  protected openCreateDialog(): void {
    this.dialogService
      .open<SupplierCreateRequest | null>(
        new PolymorpheusComponent(SupplierFormDialog, this.injector),
        {
          data: { mode: 'create', supplier: null },
          size: 's',
          dismissible: true,
          closeable: false,
        },
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((payload) => {
        if (!payload) return;
        this.supplierService
          .create(payload as SupplierCreateRequest)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({ next: () => this.refresh(), error: (e) => console.error(e) });
      });
  }

  private openEditDialog(sup: SupplierListItem): void {
    this.dialogService
      .open<SupplierUpdateRequest | null>(
        new PolymorpheusComponent(SupplierFormDialog, this.injector),
        { data: { mode: 'edit', supplier: sup }, size: 's', dismissible: true, closeable: false },
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((payload) => {
        if (!payload) return;
        this.supplierService
          .update(payload as SupplierUpdateRequest)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({ next: () => this.refresh(), error: (e) => console.error(e) });
      });
  }

  private openDeleteDialog(sup: SupplierListItem): void {
    this.dialogService
      .open<boolean>(new PolymorpheusComponent(SupplierDeleteDialog, this.injector), {
        data: { supplier: sup },
        size: 's',
        dismissible: true,
        closeable: false,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((ok) => {
        if (!ok) return;
        this.supplierService
          .delete(sup.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({ next: () => this.refresh(), error: (e) => console.error(e) });
      });
  }

  private refresh(): void {
    this.querySubject.next(this.querySubject.getValue());
  }

  // ── API fetch ─────────────────────────────────────────────────────────────
  private fetchSuppliers(q: SupplierQuery): Observable<PageViewState<SupplierListItem>> {
    const req = this.buildSearchRequest(q);

    return this.supplierService.search(req).pipe(
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
          error: 'Không thể tải danh sách nhà cung cấp.',
          rowData: [],
          currentPage: 0,
          pageSize: q.limit,
          totalElements: 0,
          totalPages: 1,
        }),
      ),
    );
  }

  private buildSearchRequest(q: SupplierQuery): SupplierSearchRequest {
    const f = q.filters;
    const active = f.isActive === 'true' ? true : f.isActive === 'false' ? false : undefined;

    return {
      page: q.page,
      limit: q.limit,
      sortField: q.sortField,
      sortDir: q.sortDir,
      supplierCode: f.supplierCode || undefined,
      supplierName: f.supplierName || undefined,
      contactInfo: f.contactInfo || undefined,
      active,
    };
  }

  private downloadExcel(blob: Blob): void {
    const fileName = `DANH_SACH_NHA_CUNG_CAP_${Date.now()}.xlsx`;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = fileName;
    anchor.style.display = 'none';

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  // ── Formatters ────────────────────────────────────────────────────────────
  private fmtDT(iso: string): string {
    if (!iso) return '—';
    return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(
      new Date(iso),
    );
  }
}
