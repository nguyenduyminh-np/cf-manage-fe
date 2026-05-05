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

import {
  IngredientCategoryListItem,
  IngredientCategorySearchRequest,
  IngredientCategoryCreateRequest,
  IngredientCategoryUpdateRequest,
} from '../../core/models/ingredient-category/ingredient-category.model';
import { IngredientCategoryService } from '../../core/services/ingredient-category/ingredient-category.service';
import { IngredientCategoryFormDialog } from '../../shared/components/dialogs/ingredient-category-form-dialog/ingredient-category-form-dialog';
import { IngredientCategoryDeleteDialog } from '../../shared/components/dialogs/ingredient-category-delete-dialog/ingredient-category-delete-dialog';

import {
  IngredientListItem,
  IngredientSearchRequest,
  IngredientCreateRequest,
  IngredientUpdateRequest,
} from '../../core/models/ingredient/ingredient.model';
import { IngredientService } from '../../core/services/ingredient/ingredient.service';
import { IngredientFormDialog } from '../../shared/components/dialogs/ingredient-form-dialog/ingredient-form-dialog';
import { IngredientDeleteDialog } from '../../shared/components/dialogs/ingredient-delete-dialog/ingredient-delete-dialog';
import { downloadBlobFile } from '../../shared/utils/file-download.utils';
import { UiSelectComponent } from '../../shared/components/ui-component/ui-select/ui-select';

// ─── Tab ──────────────────────────────────────────────────────────────────────
export type ActiveTab = 'category' | 'ingredient';

// ─── Generic View State ───────────────────────────────────────────────────────
interface PageViewState<T> {
  isLoading: boolean;
  error: string | null;
  rowData: T[];
  currentPage: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
}

// ─── Category types ───────────────────────────────────────────────────────────
interface IngredientCategorySearchFilters {
  searchString: string;
  isActive: string;
}
interface IngredientCategoryQuery {
  page: number;
  limit: number;
  sortField?: string;
  sortDir?: string;
  filters: IngredientCategorySearchFilters;
}

// ─── Ingredient types ─────────────────────────────────────────────────────────
interface IngredientSearchFilters {
  searchString: string;
  isActive: string;
}
interface IngredientQuery {
  page: number;
  limit: number;
  sortField?: string;
  sortDir?: string;
  filters: IngredientSearchFilters;
}

@Component({
  standalone: true,
  selector: 'app-ingredient',
  imports: [AsyncPipe, AgGridAngular, FormsModule, UiSelectComponent],
  templateUrl: './ingredient.html',
  styleUrl: './ingredient.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Ingredient implements OnDestroy {
  private readonly ingredientCategoryService = inject(IngredientCategoryService);
  private readonly ingredientService = inject(IngredientService);
  private readonly dialogService = inject(TuiDialogService);
  private readonly alertService = inject(TuiAlertService);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);

  // ── Tab state ──────────────────────────────────────────────────────────────
  protected activeTab: ActiveTab = 'category';
  protected readonly isExporting = signal(false);

  protected switchTab(tab: ActiveTab): void {
    if (this.activeTab === tab) return;
    this.activeTab = tab;
    this.cancelAllRaf();
  }

  // ── RAF handles (cancelled on destroy & tab switch) ────────────────────────
  private catFitRafId: number | null = null;
  private ingFitRafId: number | null = null;

  private cancelAllRaf(): void {
    if (this.catFitRafId !== null) {
      cancelAnimationFrame(this.catFitRafId);
      this.catFitRafId = null;
    }
    if (this.ingFitRafId !== null) {
      cancelAnimationFrame(this.ingFitRafId);
      this.ingFitRafId = null;
    }
  }

  ngOnDestroy(): void {
    this.cancelAllRaf();
  }

  // ── Debounce timers ────────────────────────────────────────────────────────
  private catDebounceId: number | null = null;
  private ingDebounceId: number | null = null;
  private readonly DEBOUNCE_MS = 500;

  protected readonly activeStatusOptions = [
    { label: 'Tất cả', value: '' },
    { label: 'Đang hoạt động', value: 'true' },
    { label: 'Ngừng hoạt động', value: 'false' },
  ];
  protected readonly pageSizeOptions = [10, 20, 50];

  // ══════════════════════════════════════════════════════════════════════════
  //  CATEGORY TAB
  // ══════════════════════════════════════════════════════════════════════════

  private readonly catQuerySubject = new BehaviorSubject<IngredientCategoryQuery>({
    page: 0,
    limit: 20,
    sortField: 'createdTime',
    sortDir: 'desc',
    filters: { searchString: '', isActive: '' },
  });

  protected readonly catState$: Observable<PageViewState<IngredientCategoryListItem>> =
    this.catQuerySubject.pipe(
      switchMap((q) => this.fetchCategories(q)),
      tap((s) => (this.catLatestState = s)),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

  private catLatestState: PageViewState<IngredientCategoryListItem> | null = null;
  private catGridApi: GridApi<IngredientCategoryListItem> | null = null;

  protected catSearchFilters: IngredientCategorySearchFilters = {
    searchString: '',
    isActive: '',
  };

  // ── Category column defs ───────────────────────────────────────────────────
  protected readonly catColumnDefs: ColDef<IngredientCategoryListItem>[] = [
    {
      headerName: 'STT',
      valueGetter: (p: ValueGetterParams<IngredientCategoryListItem>) =>
        (p.node?.rowIndex ?? 0) +
        1 +
        (this.catLatestState?.currentPage ?? 0) * (this.catLatestState?.pageSize ?? 20),
      flex: 0.55,
      minWidth: 72,
      maxWidth: 90,
      pinned: 'left',
      sortable: false,
      filter: false,
      cellClass: 'cell-center cell-bold',
    },
    {
      headerName: 'Mã danh mục',
      field: 'ingredientCategoryCode',
      minWidth: 160,
      flex: 1.2,
      sortable: true,
      filter: true,
      valueFormatter: (p: ValueFormatterParams<IngredientCategoryListItem>) => p.value || '-',
    },
    {
      headerName: 'Tên danh mục',
      field: 'ingredientCategoryName',
      minWidth: 220,
      flex: 2,
      sortable: true,
      filter: true,
    },
    {
      headerName: 'Danh mục cha',
      field: 'parentCategoryName',
      minWidth: 200,
      flex: 1.5,
      sortable: false,
      filter: false,
      valueFormatter: (p: ValueFormatterParams<IngredientCategoryListItem>) => p.value || '-',
    },
    {
      headerName: 'SL Nguyên liệu',
      field: 'ingredientCount',
      minWidth: 150,
      flex: 1.2,
      sortable: true,
      filter: false,
      cellClass: 'cell-center',
    },
    {
      headerName: 'Trạng thái',
      field: 'active',
      minWidth: 170,
      flex: 1.2,
      sortable: false,
      filter: false,
      cellRenderer: (p: ICellRendererParams<IngredientCategoryListItem>) => {
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
      valueFormatter: (p: ValueFormatterParams<IngredientCategoryListItem>) => this.fmtDT(p.value),
    },
    {
      headerName: 'Thao tác',
      colId: 'cat-actions',
      cellRenderer: () =>
        `<span class="material-symbols-outlined action-icon action-icon--edit" data-action="edit" title="Chỉnh sửa">edit</span>` +
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

  // ── Category grid events ───────────────────────────────────────────────────
  protected onCatGridReady(e: GridReadyEvent<IngredientCategoryListItem>): void {
    this.catGridApi = e.api;
    this.fitCatGrid();
  }
  protected onCatGridSizeChanged(_e: GridSizeChangedEvent<IngredientCategoryListItem>): void {
    this.fitCatGrid();
  }
  private fitCatGrid(): void {
    const api = this.catGridApi;
    if (!api) return;
    if (this.catFitRafId !== null) cancelAnimationFrame(this.catFitRafId);
    this.catFitRafId = requestAnimationFrame(() => {
      this.catFitRafId = null;
      api.sizeColumnsToFit({ defaultMinWidth: 80 });
    });
  }
  protected onCatCellClicked(e: CellClickedEvent<IngredientCategoryListItem>): void {
    if (e.colDef.colId !== 'cat-actions' || !e.data) return;
    const action = (e.event?.target as HTMLElement)
      ?.closest('[data-action]')
      ?.getAttribute('data-action');
    if (action === 'edit') this.openCatEditDialog(e.data);
    else if (action === 'delete') this.openCatDeleteDialog(e.data);
  }

  // ── Category search ────────────────────────────────────────────────────────
  protected catApplySearch(): void {
    const c = this.catQuerySubject.getValue();
    this.catQuerySubject.next({ ...c, page: 0, filters: { ...this.catSearchFilters } });
  }
  protected catOnFiltersChanged(): void {
    if (this.catDebounceId) clearTimeout(this.catDebounceId);
    this.catDebounceId = window.setTimeout(() => this.catApplySearch(), this.DEBOUNCE_MS);
  }
  protected catResetSearch(): void {
    this.catSearchFilters = { searchString: '', isActive: '' };
    this.catApplySearch();
  }

  protected catSetActiveFilter(value: string | number | null): void {
    this.catSearchFilters = {
      ...this.catSearchFilters,
      isActive: value === null ? '' : String(value),
    };
    this.catOnFiltersChanged();
  }

  // ── Category pagination ────────────────────────────────────────────────────
  protected catSetPageSize(s: number): void {
    const c = this.catQuerySubject.getValue();
    if (c.limit === s) return;
    this.catQuerySubject.next({ ...c, page: 0, limit: s });
  }
  protected catPrev(): void {
    const c = this.catQuerySubject.getValue();
    if (c.page > 0) this.catQuerySubject.next({ ...c, page: c.page - 1 });
  }
  protected catNext(): void {
    const c = this.catQuerySubject.getValue();
    if (this.catLatestState && c.page < this.catLatestState.totalPages - 1)
      this.catQuerySubject.next({ ...c, page: c.page + 1 });
  }
  protected catCanPrev(s: PageViewState<IngredientCategoryListItem> | null): boolean {
    return !!s && s.currentPage > 0 && !s.isLoading;
  }
  protected catCanNext(s: PageViewState<IngredientCategoryListItem> | null): boolean {
    return !!s && s.currentPage < s.totalPages - 1 && !s.isLoading;
  }

  // ── Category dialogs ───────────────────────────────────────────────────────
  protected openCatCreateDialog(): void {
    this.dialogService
      .open<IngredientCategoryCreateRequest | null>(
        new PolymorpheusComponent(IngredientCategoryFormDialog, this.injector),
        {
          data: { mode: 'create', category: null },
          size: 's',
          dismissible: true,
          closeable: false,
        },
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((payload) => {
        if (!payload) return;
        this.ingredientCategoryService
          .create(payload as IngredientCategoryCreateRequest)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({ next: () => this.catRefresh(), error: (e) => console.error(e) });
      });
  }
  private openCatEditDialog(cat: IngredientCategoryListItem): void {
    this.dialogService
      .open<IngredientCategoryUpdateRequest | null>(
        new PolymorpheusComponent(IngredientCategoryFormDialog, this.injector),
        { data: { mode: 'edit', category: cat }, size: 's', dismissible: true, closeable: false },
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((payload) => {
        if (!payload) return;
        this.ingredientCategoryService
          .update(payload as IngredientCategoryUpdateRequest)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({ next: () => this.catRefresh(), error: (e) => console.error(e) });
      });
  }
  private openCatDeleteDialog(cat: IngredientCategoryListItem): void {
    this.dialogService
      .open<boolean>(new PolymorpheusComponent(IngredientCategoryDeleteDialog, this.injector), {
        data: { category: cat },
        size: 's',
        dismissible: true,
        closeable: false,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((ok) => {
        if (!ok) return;
        this.ingredientCategoryService
          .delete(cat.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({ next: () => this.catRefresh(), error: (e) => console.error(e) });
      });
  }
  private catRefresh(): void {
    this.catQuerySubject.next(this.catQuerySubject.getValue());
  }

  // ── Category API ───────────────────────────────────────────────────────────
  private fetchCategories(
    q: IngredientCategoryQuery,
  ): Observable<PageViewState<IngredientCategoryListItem>> {
    const isActive =
      q.filters.isActive === 'true' ? true : q.filters.isActive === 'false' ? false : undefined;
    const req: IngredientCategorySearchRequest = {
      page: q.page,
      limit: q.limit,
      sortField: q.sortField,
      sortDir: q.sortDir,
      searchString: q.filters.searchString || undefined,
      active: isActive,
    };
    return this.ingredientCategoryService.search(req).pipe(
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
          error: 'Không thể tải danh sách danh mục.',
          rowData: [],
          currentPage: 0,
          pageSize: q.limit,
          totalElements: 0,
          totalPages: 1,
        }),
      ),
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  INGREDIENT TAB
  // ══════════════════════════════════════════════════════════════════════════

  private readonly ingQuerySubject = new BehaviorSubject<IngredientQuery>({
    page: 0,
    limit: 20,
    sortField: 'createdTime',
    sortDir: 'DESC',
    filters: { searchString: '', isActive: '' },
  });

  protected readonly ingState$: Observable<PageViewState<IngredientListItem>> =
    this.ingQuerySubject.pipe(
      switchMap((q) => this.fetchIngredients(q)),
      tap((s) => (this.ingLatestState = s)),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

  private ingLatestState: PageViewState<IngredientListItem> | null = null;
  private ingGridApi: GridApi<IngredientListItem> | null = null;

  protected ingSearchFilters: IngredientSearchFilters = { searchString: '', isActive: '' };

  // ── Ingredient column defs ─────────────────────────────────────────────────
  protected readonly ingColumnDefs: ColDef<IngredientListItem>[] = [
    {
      headerName: 'STT',
      valueGetter: (p: ValueGetterParams<IngredientListItem>) =>
        (p.node?.rowIndex ?? 0) +
        1 +
        (this.ingLatestState?.currentPage ?? 0) * (this.ingLatestState?.pageSize ?? 20),
      flex: 0.5,
      minWidth: 68,
      maxWidth: 88,
      pinned: 'left',
      sortable: false,
      filter: false,
      cellClass: 'cell-center cell-bold',
    },
    {
      headerName: 'Mã nguyên liệu',
      field: 'ingredientCode',
      minWidth: 165,
      flex: 1.2,
      sortable: true,
      filter: true,
      valueFormatter: (p: ValueFormatterParams<IngredientListItem>) => p.value || '—',
      cellRenderer: (p: ICellRendererParams<IngredientListItem>) => {
        const code = p.data?.ingredientCode ?? '—';
        return `<span class="ing-code-cell">${code}</span>`;
      },
    },
    {
      headerName: 'Tên nguyên liệu',
      field: 'ingredientName',
      minWidth: 210,
      flex: 2,
      sortable: true,
      filter: true,
    },
    {
      headerName: 'Danh mục',
      field: 'ingredientCategoryName',
      minWidth: 165,
      flex: 1.4,
      sortable: false,
      filter: false,
      valueFormatter: (p: ValueFormatterParams<IngredientListItem>) => p.value || '—',
    },
    {
      headerName: 'Nhà cung cấp',
      field: 'supplierName',
      minWidth: 175,
      flex: 1.5,
      sortable: false,
      filter: false,
      valueFormatter: (p: ValueFormatterParams<IngredientListItem>) => p.value || '—',
    },
    {
      headerName: 'Đơn vị',
      field: 'unitName',
      minWidth: 110,
      flex: 0.8,
      sortable: false,
      filter: false,
      cellClass: 'cell-center',
      valueFormatter: (p: ValueFormatterParams<IngredientListItem>) => p.value || '—',
    },
    {
      headerName: 'Tồn kho',
      field: 'currentStock',
      minWidth: 120,
      flex: 0.9,
      sortable: true,
      filter: false,
      cellClass: 'cell-right cell-bold',
      cellRenderer: (p: ICellRendererParams<IngredientListItem>) => {
        const qty = p.value ?? 0;
        const cls =
          qty === 0
            ? 'stock-badge stock-badge--empty'
            : qty < 10
              ? 'stock-badge stock-badge--low'
              : 'stock-badge stock-badge--ok';
        return `<span class="${cls}">${qty}</span>`;
      },
    },
    {
      headerName: 'Giá TB',
      field: 'averagePrice',
      minWidth: 145,
      flex: 1.1,
      sortable: true,
      filter: false,
      cellClass: 'cell-right cell-bold',
      valueFormatter: (p: ValueFormatterParams<IngredientListItem>) => this.fmtCurrency(p.value),
    },
    {
      headerName: 'HSD (ngày)',
      field: 'selfLife',
      minWidth: 120,
      flex: 0.85,
      sortable: false,
      filter: false,
      cellClass: 'cell-center',
      valueFormatter: (p: ValueFormatterParams<IngredientListItem>) =>
        p.value != null ? `${p.value} ngày` : '—',
    },
    {
      headerName: 'Trạng thái',
      field: 'active',
      minWidth: 160,
      flex: 1.1,
      sortable: false,
      filter: false,
      cellRenderer: (p: ICellRendererParams<IngredientListItem>) => {
        const ok = p.value === true;
        return `<span class="status-badge status-badge--${ok ? 'active' : 'inactive'}">${ok ? 'Đang hoạt động' : 'Ngừng hoạt động'}</span>`;
      },
    },
    {
      headerName: 'Ngày tạo',
      field: 'createdTime',
      minWidth: 155,
      flex: 1.1,
      sortable: true,
      filter: false,
      valueFormatter: (p: ValueFormatterParams<IngredientListItem>) => this.fmtDT(p.value),
    },
    {
      headerName: 'Thao tác',
      colId: 'ing-actions',
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

  // ── Ingredient grid events ─────────────────────────────────────────────────
  protected onIngGridReady(e: GridReadyEvent<IngredientListItem>): void {
    this.ingGridApi = e.api;
    this.fitIngGrid();
  }
  protected onIngGridSizeChanged(_e: GridSizeChangedEvent<IngredientListItem>): void {
    this.fitIngGrid();
  }
  private fitIngGrid(): void {
    const api = this.ingGridApi;
    if (!api) return;
    if (this.ingFitRafId !== null) cancelAnimationFrame(this.ingFitRafId);
    this.ingFitRafId = requestAnimationFrame(() => {
      this.ingFitRafId = null;
      api.sizeColumnsToFit({ defaultMinWidth: 80 });
    });
  }
  protected onIngCellClicked(e: CellClickedEvent<IngredientListItem>): void {
    if (e.colDef.colId !== 'ing-actions' || !e.data) return;
    const action = (e.event?.target as HTMLElement)
      ?.closest('[data-action]')
      ?.getAttribute('data-action');
    if (action === 'edit') this.openIngEditDialog(e.data);
    else if (action === 'delete') this.openIngDeleteDialog(e.data);
  }
  protected onIngRowDoubleClicked(e: RowDoubleClickedEvent<IngredientListItem>): void {
    if (e.data) this.openIngEditDialog(e.data);
  }

  // ── Ingredient search ──────────────────────────────────────────────────────
  protected ingApplySearch(): void {
    const c = this.ingQuerySubject.getValue();
    this.ingQuerySubject.next({ ...c, page: 0, filters: { ...this.ingSearchFilters } });
  }
  protected ingOnFiltersChanged(): void {
    if (this.ingDebounceId) clearTimeout(this.ingDebounceId);
    this.ingDebounceId = window.setTimeout(() => this.ingApplySearch(), this.DEBOUNCE_MS);
  }
  protected ingResetSearch(): void {
    this.ingSearchFilters = { searchString: '', isActive: '' };
    this.ingApplySearch();
  }

  protected ingSetActiveFilter(value: string | number | null): void {
    this.ingSearchFilters = {
      ...this.ingSearchFilters,
      isActive: value === null ? '' : String(value),
    };
    this.ingOnFiltersChanged();
  }

  // ── Ingredient pagination ──────────────────────────────────────────────────
  protected ingSetPageSize(s: number): void {
    const c = this.ingQuerySubject.getValue();
    if (c.limit === s) return;
    this.ingQuerySubject.next({ ...c, page: 0, limit: s });
  }
  protected ingPrev(): void {
    const c = this.ingQuerySubject.getValue();
    if (c.page > 0) this.ingQuerySubject.next({ ...c, page: c.page - 1 });
  }
  protected ingNext(): void {
    const c = this.ingQuerySubject.getValue();
    if (this.ingLatestState && c.page < this.ingLatestState.totalPages - 1)
      this.ingQuerySubject.next({ ...c, page: c.page + 1 });
  }
  protected ingCanPrev(s: PageViewState<IngredientListItem> | null): boolean {
    return !!s && s.currentPage > 0 && !s.isLoading;
  }
  protected ingCanNext(s: PageViewState<IngredientListItem> | null): boolean {
    return !!s && s.currentPage < s.totalPages - 1 && !s.isLoading;
  }

  // ── Ingredient dialogs ─────────────────────────────────────────────────────
  protected openIngCreateDialog(): void {
    this.dialogService
      .open<IngredientCreateRequest | null>(
        new PolymorpheusComponent(IngredientFormDialog, this.injector),
        {
          data: { mode: 'create', ingredient: null },
          size: 's',
          dismissible: true,
          closeable: false,
        },
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((payload) => {
        if (!payload) return;
        this.ingredientService
          .create(payload as IngredientCreateRequest)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({ next: () => this.ingRefresh(), error: (e) => console.error(e) });
      });
  }
  private openIngEditDialog(ing: IngredientListItem): void {
    this.dialogService
      .open<IngredientUpdateRequest | null>(
        new PolymorpheusComponent(IngredientFormDialog, this.injector),
        { data: { mode: 'edit', ingredient: ing }, size: 's', dismissible: true, closeable: false },
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((payload) => {
        if (!payload) return;
        this.ingredientService
          .update(payload as IngredientUpdateRequest)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({ next: () => this.ingRefresh(), error: (e) => console.error(e) });
      });
  }
  private openIngDeleteDialog(ing: IngredientListItem): void {
    this.dialogService
      .open<boolean>(new PolymorpheusComponent(IngredientDeleteDialog, this.injector), {
        data: { ingredient: ing },
        size: 's',
        dismissible: true,
        closeable: false,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((ok) => {
        if (!ok) return;
        this.ingredientService
          .delete(ing.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({ next: () => this.ingRefresh(), error: (e) => console.error(e) });
      });
  }
  private ingRefresh(): void {
    this.ingQuerySubject.next(this.ingQuerySubject.getValue());
  }

  // ── Ingredient API ─────────────────────────────────────────────────────────
  private fetchIngredients(q: IngredientQuery): Observable<PageViewState<IngredientListItem>> {
    const isActive =
      q.filters.isActive === 'true' ? true : q.filters.isActive === 'false' ? false : undefined;
    const req: IngredientSearchRequest = {
      page: q.page,
      limit: q.limit,
      sortField: q.sortField,
      sortDir: q.sortDir,
      searchString: q.filters.searchString || undefined,
      active: isActive,
    };

    return this.ingredientService.search(req).pipe(
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
          error: 'Không thể tải danh sách nguyên liệu.',
          rowData: [],
          currentPage: 0,
          pageSize: q.limit,
          totalElements: 0,
          totalPages: 1,
        }),
      ),
    );
  }

  // ── Export ────────────────────────────────────────────────────────────────
  protected exportExcel(): void {
    if (this.isExporting()) {
      return;
    }

    const activeTab = this.activeTab;
    this.isExporting.set(true);

    let export$: Observable<Blob>;
    if (activeTab === 'category') {
      const q = this.catQuerySubject.getValue();
      const isActive =
        q.filters.isActive === 'true' ? true : q.filters.isActive === 'false' ? false : undefined;
      const req: IngredientCategorySearchRequest = {
        page: 0,
        limit: Math.max(1, this.catLatestState?.totalElements ?? q.limit),
        sortField: q.sortField,
        sortDir: q.sortDir,
        searchString: q.filters.searchString || undefined,
        active: isActive,
      };
      export$ = this.ingredientCategoryService.exportExcel(req);
    } else {
      const q = this.ingQuerySubject.getValue();
      const isActive =
        q.filters.isActive === 'true' ? true : q.filters.isActive === 'false' ? false : undefined;
      const req: IngredientSearchRequest = {
        page: 0,
        limit: Math.max(1, this.ingLatestState?.totalElements ?? q.limit),
        sortField: q.sortField,
        sortDir: q.sortDir,
        searchString: q.filters.searchString || undefined,
        active: isActive,
      };
      export$ = this.ingredientService.exportExcel(req);
    }

    export$
      .pipe(
        finalize(() => this.isExporting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (blob) => {
          const fileName =
            activeTab === 'category'
              ? `DANH_SACH_DANH_MUC_NGUYEN_LIEU_${Date.now()}.xlsx`
              : `DANH_SACH_NGUYEN_LIEU_${Date.now()}.xlsx`;
          downloadBlobFile(blob, fileName, this.alertService);
        },
        error: () =>
          this.alertService.open('Không thể xuất Excel.', { appearance: 'error' }).subscribe(),
      });
  }

  // ── Shared Helper ─────────────────────────────────────────────────────────
  protected pageSummary(s: PageViewState<unknown> | null): string {
    if (!s) return 'Trang 1/1';
    return `Trang ${s.currentPage + 1}/${s.totalPages}`;
  }
  private fmtDT(iso: string): string {
    if (!iso) return '—';
    return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(
      new Date(iso),
    );
  }
  private fmtCurrency(v: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v ?? 0);
  }
}
