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

import {
  WarehouseListItem,
  WarehouseSearchRequest,
  WarehouseCreateRequest,
  WarehouseUpdateRequest,
} from '../../core/models/warehouse/warehouse.model';
import { WarehouseService } from '../../core/services/warehouse/warehouse.service';
import { WarehouseFormDialog } from '../../shared/components/dialogs/warehouse-form-dialog/warehouse-form-dialog';
import { WarehouseDeleteDialog } from '../../shared/components/dialogs/warehouse-delete-dialog/warehouse-delete-dialog';
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
interface WarehouseSearchFilters {
  searchString: string;
  isActive: string;
}

interface WarehouseQuery {
  page: number;
  limit: number;
  sortField?: string;
  sortDir?: string;
  filters: WarehouseSearchFilters;
}

@Component({
  standalone: true,
  selector: 'app-warehouse',
  imports: [AsyncPipe, AgGridAngular, FormsModule, TuiButton, UiSelectComponent],
  templateUrl: './warehouse.html',
  styleUrl: './warehouse.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Warehouse implements OnDestroy {
  private readonly warehouseService = inject(WarehouseService);
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
    { label: 'Tất cả', value: '' },
    { label: 'Đang hoạt động', value: 'true' },
    { label: 'Ngừng hoạt động', value: 'false' },
  ];
  protected readonly pageSizeOptions = [10, 20, 50];
  protected readonly pageSizeSelectOptions = this.pageSizeOptions.map((s) => ({
    label: String(s),
    value: s,
  }));

  // ── Query subject ─────────────────────────────────────────────────────────
  private readonly querySubject = new BehaviorSubject<WarehouseQuery>({
    page: 0,
    limit: 20,
    sortField: 'createdTime',
    sortDir: 'desc',
    filters: { searchString: '', isActive: '' },
  });

  protected readonly state$: Observable<PageViewState<WarehouseListItem>> = this.querySubject.pipe(
    switchMap((q) => this.fetchWarehouses(q)),
    tap((s) => (this.latestState = s)),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  private latestState: PageViewState<WarehouseListItem> | null = null;
  private gridApi: GridApi<WarehouseListItem> | null = null;

  protected searchFilters: WarehouseSearchFilters = {
    searchString: '',
    isActive: '',
  };

  // ── Column defs ───────────────────────────────────────────────────────────
  protected readonly columnDefs: ColDef<WarehouseListItem>[] = [
    {
      headerName: 'STT',
      valueGetter: (p: ValueGetterParams<WarehouseListItem>) =>
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
      headerName: 'Mã nhà kho',
      field: 'warehouseCode',
      minWidth: 150,
      flex: 1.2,
      sortable: true,
      filter: true,
      valueFormatter: (p: ValueFormatterParams<WarehouseListItem>) => p.value || '—',
      cellRenderer: (p: ICellRendererParams<WarehouseListItem>) => {
        const code = p.data?.warehouseCode ?? '—';
        return `<span class="wh-code-cell">${code}</span>`;
      },
    },
    {
      headerName: 'Tên nhà kho',
      field: 'warehouseName',
      minWidth: 200,
      flex: 2,
      sortable: true,
      filter: true,
    },
    {
      headerName: 'Vị trí',
      field: 'location',
      minWidth: 180,
      flex: 1.5,
      sortable: false,
      filter: false,
      valueFormatter: (p: ValueFormatterParams<WarehouseListItem>) => p.value || '—',
    },
    {
      headerName: 'Ghi chú',
      field: 'note',
      minWidth: 180,
      flex: 1.5,
      sortable: false,
      filter: false,
      valueFormatter: (p: ValueFormatterParams<WarehouseListItem>) => p.value || '—',
    },
    {
      headerName: 'SL Nguyên liệu',
      field: 'ingredientCount',
      minWidth: 150,
      flex: 1,
      sortable: true,
      filter: false,
      cellClass: 'cell-right',
      valueFormatter: (p: ValueFormatterParams<WarehouseListItem>) => {
        return p.value ? p.value.toLocaleString('vi-VN') : '0';
      },
    },
    {
      headerName: 'Trạng thái',
      field: 'active',
      minWidth: 170,
      flex: 1.1,
      sortable: false,
      filter: false,
      cellRenderer: (p: ICellRendererParams<WarehouseListItem>) => {
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
      valueFormatter: (p: ValueFormatterParams<WarehouseListItem>) => this.fmtDT(p.value),
    },
    {
      headerName: 'Thao tác',
      colId: 'wh-actions',
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
  protected onGridReady(e: GridReadyEvent<WarehouseListItem>): void {
    this.gridApi = e.api;
    this.fitGrid();
  }
  protected onGridSizeChanged(_e: GridSizeChangedEvent<WarehouseListItem>): void {
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

  protected onCellClicked(e: CellClickedEvent<WarehouseListItem>): void {
    if (e.colDef.colId !== 'wh-actions' || !e.data) return;
    const action = (e.event?.target as HTMLElement)
      ?.closest('[data-action]')
      ?.getAttribute('data-action');
    if (action === 'edit') this.openEditDialog(e.data);
    else if (action === 'delete') this.openDeleteDialog(e.data);
  }

  protected onRowDoubleClicked(e: RowDoubleClickedEvent<WarehouseListItem>): void {
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
  protected resetSearch(): void {
    this.searchFilters = { searchString: '', isActive: '' };
    this.applySearch();
  }

  protected setActiveStatus(value: string | number | null): void {
    this.searchFilters = {
      ...this.searchFilters,
      isActive: value === null ? '' : String(value),
    };
    this.onFiltersChanged();
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
    this.warehouseService
      .exportExcel(request)
      .pipe(
        finalize(() => this.isExporting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (blob) => this.downloadExcel(blob),
        error: (e) => console.error('Không thể xuất Excel danh sách nhà kho.', e),
      });
  }

  // ── Pagination ────────────────────────────────────────────────────────────
  protected setPageSize(s: number): void {
    const c = this.querySubject.getValue();
    if (c.limit === s) return;
    this.querySubject.next({ ...c, page: 0, limit: s });
  }

  protected setPageSizeFromSelect(value: string | number | null): void {
    if (value === null) return;
    const size = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(size)) return;
    this.setPageSize(size);
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
  protected canPrev(s: PageViewState<WarehouseListItem> | null): boolean {
    return !!s && s.currentPage > 0 && !s.isLoading;
  }
  protected canNext(s: PageViewState<WarehouseListItem> | null): boolean {
    return !!s && s.currentPage < s.totalPages - 1 && !s.isLoading;
  }
  protected pageSummary(s: PageViewState<unknown> | null): string {
    if (!s) return 'Trang 1/1';
    return `Trang ${s.currentPage + 1}/${s.totalPages}`;
  }

  // ── Dialogs ───────────────────────────────────────────────────────────────
  protected openCreateDialog(): void {
    this.dialogService
      .open<WarehouseCreateRequest | null>(
        new PolymorpheusComponent(WarehouseFormDialog, this.injector),
        {
          data: { mode: 'create', warehouse: null },
          size: 's',
          dismissible: true,
          closeable: false,
        },
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((payload) => {
        if (!payload) return;
        this.warehouseService
          .create(payload as WarehouseCreateRequest)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({ next: () => this.refresh(), error: (e) => console.error(e) });
      });
  }

  private openEditDialog(wh: WarehouseListItem): void {
    this.dialogService
      .open<WarehouseUpdateRequest | null>(
        new PolymorpheusComponent(WarehouseFormDialog, this.injector),
        { data: { mode: 'edit', warehouse: wh }, size: 's', dismissible: true, closeable: false },
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((payload) => {
        if (!payload) return;
        this.warehouseService
          .update(payload as WarehouseUpdateRequest)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({ next: () => this.refresh(), error: (e) => console.error(e) });
      });
  }

  private openDeleteDialog(wh: WarehouseListItem): void {
    this.dialogService
      .open<boolean>(new PolymorpheusComponent(WarehouseDeleteDialog, this.injector), {
        data: { warehouse: wh },
        size: 's',
        dismissible: true,
        closeable: false,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((ok) => {
        if (!ok) return;
        this.warehouseService
          .delete(wh.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({ next: () => this.refresh(), error: (e) => console.error(e) });
      });
  }

  private refresh(): void {
    this.querySubject.next(this.querySubject.getValue());
  }

  // ── API fetch ─────────────────────────────────────────────────────────────
  private fetchWarehouses(q: WarehouseQuery): Observable<PageViewState<WarehouseListItem>> {
    const req = this.buildSearchRequest(q);

    return this.warehouseService.search(req).pipe(
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
          error: 'Không thể tải danh sách nhà kho.',
          rowData: [],
          currentPage: 0,
          pageSize: q.limit,
          totalElements: 0,
          totalPages: 1,
        }),
      ),
    );
  }

  private buildSearchRequest(q: WarehouseQuery): WarehouseSearchRequest {
    const f = q.filters;
    const active = f.isActive === 'true' ? true : f.isActive === 'false' ? false : undefined;

    return {
      page: q.page,
      limit: q.limit,
      sortField: q.sortField,
      sortDir: q.sortDir,
      searchString: f.searchString || undefined,
      active,
    };
  }

  private downloadExcel(blob: Blob): void {
    const fileName = `DANH_SACH_NHA_KHO_${Date.now()}.xlsx`;
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
