import { AsyncPipe } from '@angular/common';
import { environment } from '../../../environments/environment';
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
  DishCategoryListItem,
  DishCategorySearchRequest,
  DishCategoryCreateRequest,
  DishCategoryUpdateRequest,
} from '../../core/models/dish-category/dish-category.model';
import { DishCategoryService } from '../../core/services/dish-category/dish-category.service';
import { DishCategoryFormDialog } from '../../shared/components/dialogs/dish-category-form-dialog/dish-category-form-dialog';
import { DishCategoryDeleteDialog } from '../../shared/components/dialogs/dish-category-delete-dialog/dish-category-delete-dialog';
import { UiSelectComponent } from '../../shared/components/ui-component/ui-select/ui-select';

import {
  DishListItem,
  DishSearchRequest,
  DishCreateRequest,
  DishUpdateRequest,
} from '../../core/models/dish/dish.model';
import { DishService } from '../../core/services/dish/dish.service';
import { DishFormDialog } from '../../shared/components/dialogs/dish-form-dialog/dish-form-dialog';
import { DishDeleteDialog } from '../../shared/components/dialogs/dish-delete-dialog/dish-delete-dialog';
import { downloadBlobFile } from '../../shared/utils/file-download.utils';
import { BreadcrumbComponent } from '../../shared/components/ui-component/breadcrumb/breadcrumb';

// ─── Tab ──────────────────────────────────────────────────────────────────────
export type ActiveTab = 'category' | 'dish';

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
interface DishCategorySearchFilters {
  dishCategoryCode: string;
  dishCategoryName: string;
  isActive: string;
}
interface DishCategoryQuery {
  page: number;
  limit: number;
  sortField?: string;
  sortDir?: string;
  filters: DishCategorySearchFilters;
}

// ─── Dish types ───────────────────────────────────────────────────────────────
interface DishSearchFilters {
  dishCode: string;
  dishName: string;
  isActive: string;
}
interface DishQuery {
  page: number;
  limit: number;
  sortField?: string;
  sortDir?: string;
  filters: DishSearchFilters;
}

@Component({
  standalone: true,
  selector: 'app-dish',
  imports: [AsyncPipe, AgGridAngular, FormsModule, UiSelectComponent, BreadcrumbComponent],
  templateUrl: './dish.html',
  styleUrl: './dish.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dish implements OnDestroy {
  private readonly dishCategoryService = inject(DishCategoryService);
  private readonly dishService = inject(DishService);
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
    // Cancel pending RAF for the tab being hidden
    this.cancelAllRaf();
  }

  // ── RAF handles (cancelled on destroy & tab switch) ────────────────────────
  private catFitRafId: number | null = null;
  private dishFitRafId: number | null = null;

  private cancelAllRaf(): void {
    if (this.catFitRafId !== null) {
      cancelAnimationFrame(this.catFitRafId);
      this.catFitRafId = null;
    }
    if (this.dishFitRafId !== null) {
      cancelAnimationFrame(this.dishFitRafId);
      this.dishFitRafId = null;
    }
  }

  ngOnDestroy(): void {
    this.cancelAllRaf();
  }

  // ── Debounce timers ────────────────────────────────────────────────────────
  private catDebounceId: number | null = null;
  private dishDebounceId: number | null = null;
  private readonly DEBOUNCE_MS = 500;

  // ══════════════════════════════════════════════════════════════════════════
  //  CATEGORY TAB
  // ══════════════════════════════════════════════════════════════════════════

  private readonly catQuerySubject = new BehaviorSubject<DishCategoryQuery>({
    page: 0,
    limit: 20,
    sortField: 'createdTime',
    sortDir: 'desc',
    filters: { dishCategoryCode: '', dishCategoryName: '', isActive: '' },
  });

  protected readonly catState$: Observable<PageViewState<DishCategoryListItem>> =
    this.catQuerySubject.pipe(
      switchMap((q) => this.fetchCategories(q)),
      tap((s) => (this.catLatestState = s)),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

  private catLatestState: PageViewState<DishCategoryListItem> | null = null;
  private catGridApi: GridApi<DishCategoryListItem> | null = null;

  protected catSearchFilters: DishCategorySearchFilters = {
    dishCategoryCode: '',
    dishCategoryName: '',
    isActive: '',
  };

  protected readonly activeStatusOptions = [
    { label: 'Tất cả', value: '' },
    { label: 'Đang hoạt động', value: 'true' },
    { label: 'Ngừng hoạt động', value: 'false' },
  ];
  protected readonly pageSizeOptions = [10, 20, 50];

  // ── Category column defs ───────────────────────────────────────────────────
  protected readonly catColumnDefs: ColDef<DishCategoryListItem>[] = [
    {
      headerName: 'STT',
      valueGetter: (p: ValueGetterParams<DishCategoryListItem>) =>
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
      field: 'dishCategoryCode',
      minWidth: 160,
      flex: 1.2,
      sortable: true,
      filter: true,
      valueFormatter: (p: ValueFormatterParams<DishCategoryListItem>) => p.value || '-',
    },
    {
      headerName: 'Tên danh mục',
      field: 'dishCategoryName',
      minWidth: 220,
      flex: 2,
      sortable: true,
      filter: true,
    },
    {
      headerName: 'Trạng thái',
      field: 'active',
      minWidth: 170,
      flex: 1.2,
      sortable: false,
      filter: false,
      cellRenderer: (p: ICellRendererParams<DishCategoryListItem>) => {
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
      valueFormatter: (p: ValueFormatterParams<DishCategoryListItem>) => this.fmtDT(p.value),
    },
    {
      headerName: 'Thao tác',
      colId: 'cat-actions',
      cellRenderer: () =>
        `<span class="material-symbols-outlined action-icon action-icon--view" data-action="view" title="Xem chi tiết">visibility</span>` +
        `<span class="material-symbols-outlined action-icon action-icon--edit" data-action="edit" title="Chỉnh sửa">edit</span>` +
        `<span class="material-symbols-outlined action-icon action-icon--delete" data-action="delete" title="Xóa">delete</span>`,
      width: 140,
      minWidth: 140,
      maxWidth: 160,
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
  protected onCatGridReady(e: GridReadyEvent<DishCategoryListItem>): void {
    this.catGridApi = e.api;
    this.fitCatGrid();
  }
  protected onCatGridSizeChanged(_e: GridSizeChangedEvent<DishCategoryListItem>): void {
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
  protected onCatCellClicked(e: CellClickedEvent<DishCategoryListItem>): void {
    if (e.colDef.colId !== 'cat-actions' || !e.data) return;
    const action = (e.event?.target as HTMLElement)
      ?.closest('[data-action]')
      ?.getAttribute('data-action');
    if (action === 'view') this.openCatViewDialog(e.data);
    else if (action === 'edit') this.openCatEditDialog(e.data);
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
    this.catSearchFilters = { dishCategoryCode: '', dishCategoryName: '', isActive: '' };
    this.catApplySearch();
  }

  protected catSetActiveStatus(value: string | number | null): void {
    this.catSearchFilters.isActive = typeof value === 'string' ? value : '';
    this.catOnFiltersChanged();
  }

  protected exportExcel(): void {
    if (this.isExporting()) {
      return;
    }

    const activeTab = this.activeTab;
    this.isExporting.set(true);

    const export$ =
      activeTab === 'category'
        ? this.dishCategoryService.exportExcel(this.buildCategoryExportRequest())
        : this.dishService.exportExcel(this.buildDishExportRequest());

    export$
      .pipe(
        finalize(() => this.isExporting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (blob) => {
          const fileName =
            activeTab === 'category'
              ? `DANH_SACH_DANH_MUC_MON_${Date.now()}.xlsx`
              : `DANH_SACH_MON_AN_${Date.now()}.xlsx`;
          downloadBlobFile(blob, fileName, this.alertService);
        },
        error: (error) =>
          this.alertService
            .open('Không thể xuất Excel danh sách thực đơn.', { appearance: 'error' })
            .subscribe(),
      });
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
  protected catCanPrev(s: PageViewState<DishCategoryListItem> | null): boolean {
    return !!s && s.currentPage > 0 && !s.isLoading;
  }
  protected catCanNext(s: PageViewState<DishCategoryListItem> | null): boolean {
    return !!s && s.currentPage < s.totalPages - 1 && !s.isLoading;
  }
  protected pageSummary(s: PageViewState<unknown> | null): string {
    if (!s) return 'Trang 1/1';
    return `Trang ${s.currentPage + 1}/${s.totalPages}`;
  }

  // ── Category dialogs ───────────────────────────────────────────────────────
  protected openCatCreateDialog(): void {
    this.dialogService
      .open<DishCategoryCreateRequest | null>(
        new PolymorpheusComponent(DishCategoryFormDialog, this.injector),
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
        this.dishCategoryService
          .create(payload as DishCategoryCreateRequest)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({ next: () => this.catRefresh(), error: (e) => console.error(e) });
      });
  }

  private openCatViewDialog(cat: DishCategoryListItem): void {
    this.dialogService
      .open<null>(
        new PolymorpheusComponent(DishCategoryFormDialog, this.injector),
        { data: { mode: 'view', category: cat }, size: 's', dismissible: true, closeable: false },
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  private openCatEditDialog(cat: DishCategoryListItem): void {
    this.dialogService
      .open<DishCategoryUpdateRequest | null>(
        new PolymorpheusComponent(DishCategoryFormDialog, this.injector),
        { data: { mode: 'edit', category: cat }, size: 's', dismissible: true, closeable: false },
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((payload) => {
        if (!payload) return;
        this.dishCategoryService
          .update(payload as DishCategoryUpdateRequest)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({ next: () => this.catRefresh(), error: (e) => console.error(e) });
      });
  }
  private openCatDeleteDialog(cat: DishCategoryListItem): void {
    this.dialogService
      .open<boolean>(new PolymorpheusComponent(DishCategoryDeleteDialog, this.injector), {
        data: { category: cat },
        size: 's',
        dismissible: true,
        closeable: false,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((ok) => {
        if (!ok) return;
        this.dishCategoryService
          .delete(cat.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({ next: () => this.catRefresh(), error: (e) => console.error(e) });
      });
  }
  private catRefresh(): void {
    this.catQuerySubject.next(this.catQuerySubject.getValue());
  }

  // ── Category API ───────────────────────────────────────────────────────────
  private fetchCategories(q: DishCategoryQuery): Observable<PageViewState<DishCategoryListItem>> {
    const isActive =
      q.filters.isActive === 'true' ? true : q.filters.isActive === 'false' ? false : undefined;
    const req: DishCategorySearchRequest = {
      page: q.page,
      limit: q.limit,
      sortField: q.sortField,
      sortDir: q.sortDir,
      dishCategoryCode: q.filters.dishCategoryCode || undefined,
      dishCategoryName: q.filters.dishCategoryName || undefined,
      isActive,
    };
    return this.dishCategoryService.search(req).pipe(
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
  //  DISH TAB
  // ══════════════════════════════════════════════════════════════════════════

  private readonly dishQuerySubject = new BehaviorSubject<DishQuery>({
    page: 0,
    limit: 20,
    sortField: 'createdTime',
    sortDir: 'desc',
    filters: { dishCode: '', dishName: '', isActive: '' },
  });

  protected readonly dishState$: Observable<PageViewState<DishListItem>> =
    this.dishQuerySubject.pipe(
      switchMap((q) => this.fetchDishes(q)),
      tap((s) => (this.dishLatestState = s)),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

  private dishLatestState: PageViewState<DishListItem> | null = null;
  private dishGridApi: GridApi<DishListItem> | null = null;

  protected dishSearchFilters: DishSearchFilters = { dishCode: '', dishName: '', isActive: '' };

  // ── Dish column defs ───────────────────────────────────────────────────────
  protected readonly dishColumnDefs: ColDef<DishListItem>[] = [
    {
      headerName: 'STT',
      valueGetter: (p: ValueGetterParams<DishListItem>) =>
        (p.node?.rowIndex ?? 0) +
        1 +
        (this.dishLatestState?.currentPage ?? 0) * (this.dishLatestState?.pageSize ?? 20),
      flex: 0.55,
      minWidth: 72,
      maxWidth: 90,
      pinned: 'left',
      sortable: false,
      filter: false,
      cellClass: 'cell-center cell-bold',
    },
    {
      headerName: 'Mã món',
      field: 'dishCode',
      minWidth: 140,
      flex: 1,
      sortable: true,
      filter: true,
      valueFormatter: (p: ValueFormatterParams<DishListItem>) => p.value || '-',
    },
    {
      headerName: 'Tên món ăn',
      field: 'dishName',
      minWidth: 220,
      flex: 2,
      sortable: true,
      filter: true,
      cellRenderer: (p: ICellRendererParams<DishListItem>) => {
        const name = p.data?.dishName ?? '';
        const photo = p.data?.photo ?? '';
        const src = photo ? this.resolvePhotoUrl(photo) : '';
        const imgHtml = src
          ? `<img src="${src}" alt="" class="dish-thumb" loading="lazy" onerror="this.style.display='none'" />`
          : `<span class="dish-thumb dish-thumb--placeholder material-symbols-outlined">restaurant</span>`;
        return `<div class="dish-name-cell">${imgHtml}<span class="dish-name-cell__text">${name}</span></div>`;
      },
    },
    {
      headerName: 'Giá',
      field: 'price',
      minWidth: 140,
      flex: 1,
      sortable: true,
      filter: false,
      cellClass: 'cell-bold',
      valueFormatter: (p: ValueFormatterParams<DishListItem>) => this.fmtCurrency(p.value),
    },
    {
      headerName: 'Danh mục',
      field: 'dishCategoryName',
      minWidth: 160,
      flex: 1.3,
      sortable: false,
      filter: false,
      valueFormatter: (p: ValueFormatterParams<DishListItem>) => p.value || '-',
    },
    {
      headerName: 'Trạng thái',
      field: 'active',
      minWidth: 170,
      flex: 1.2,
      sortable: false,
      filter: false,
      cellRenderer: (p: ICellRendererParams<DishListItem>) => {
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
      valueFormatter: (p: ValueFormatterParams<DishListItem>) => this.fmtDT(p.value),
    },
    {
      headerName: 'Thao tác',
      colId: 'dish-actions',
      cellRenderer: () =>
        `<span class="material-symbols-outlined action-icon action-icon--view" data-action="view" title="Xem chi tiết">visibility</span>` +
        `<span class="material-symbols-outlined action-icon action-icon--edit" data-action="edit" title="Chỉnh sửa">edit</span>` +
        `<span class="material-symbols-outlined action-icon action-icon--delete" data-action="delete" title="Xóa">delete</span>`,
      width: 140,
      minWidth: 140,
      maxWidth: 160,
      flex: 0,
      pinned: 'right',
      lockPinned: true,
      suppressSizeToFit: true,
      sortable: false,
      filter: false,
      cellClass: 'cell-center cell-actions',
    },
  ];

  // ── Dish grid events ───────────────────────────────────────────────────────
  protected onDishGridReady(e: GridReadyEvent<DishListItem>): void {
    this.dishGridApi = e.api;
    this.fitDishGrid();
  }
  protected onDishGridSizeChanged(_e: GridSizeChangedEvent<DishListItem>): void {
    this.fitDishGrid();
  }
  private fitDishGrid(): void {
    const api = this.dishGridApi;
    if (!api) return;
    if (this.dishFitRafId !== null) cancelAnimationFrame(this.dishFitRafId);
    this.dishFitRafId = requestAnimationFrame(() => {
      this.dishFitRafId = null;
      api.sizeColumnsToFit({ defaultMinWidth: 80 });
    });
  }
  protected onDishCellClicked(e: CellClickedEvent<DishListItem>): void {
    if (e.colDef.colId !== 'dish-actions' || !e.data) return;
    const action = (e.event?.target as HTMLElement)
      ?.closest('[data-action]')
      ?.getAttribute('data-action');
    if (action === 'view') this.openDishViewDialog(e.data);
    else if (action === 'edit') this.openDishEditDialog(e.data);
    else if (action === 'delete') this.openDishDeleteDialog(e.data);
  }
  protected onDishRowDoubleClicked(e: RowDoubleClickedEvent<DishListItem>): void {
    if (e.data) this.openDishEditDialog(e.data);
  }

  // ── Dish search ────────────────────────────────────────────────────────────
  protected dishApplySearch(): void {
    const c = this.dishQuerySubject.getValue();
    this.dishQuerySubject.next({ ...c, page: 0, filters: { ...this.dishSearchFilters } });
  }
  protected dishOnFiltersChanged(): void {
    if (this.dishDebounceId) clearTimeout(this.dishDebounceId);
    this.dishDebounceId = window.setTimeout(() => this.dishApplySearch(), this.DEBOUNCE_MS);
  }
  protected dishResetSearch(): void {
    this.dishSearchFilters = { dishCode: '', dishName: '', isActive: '' };
    this.dishApplySearch();
  }

  protected dishSetActiveStatus(value: string | number | null): void {
    this.dishSearchFilters.isActive = typeof value === 'string' ? value : '';
    this.dishOnFiltersChanged();
  }

  private buildCategoryExportRequest(): DishCategorySearchRequest {
    const q = this.catQuerySubject.getValue();
    const isActive =
      q.filters.isActive === 'true' ? true : q.filters.isActive === 'false' ? false : undefined;

    return {
      page: 0,
      limit: Math.max(1, this.catLatestState?.totalElements ?? q.limit),
      sortField: q.sortField,
      sortDir: q.sortDir,
      dishCategoryCode: q.filters.dishCategoryCode || undefined,
      dishCategoryName: q.filters.dishCategoryName || undefined,
      isActive,
    };
  }

  private buildDishExportRequest(): DishSearchRequest {
    const q = this.dishQuerySubject.getValue();
    const isActive =
      q.filters.isActive === 'true' ? true : q.filters.isActive === 'false' ? false : undefined;

    return {
      page: 0,
      limit: Math.max(1, this.dishLatestState?.totalElements ?? q.limit),
      sortField: q.sortField,
      sortDir: q.sortDir,
      dishCode: q.filters.dishCode || undefined,
      dishName: q.filters.dishName || undefined,
      isActive,
    };
  }

  // ── Dish pagination ────────────────────────────────────────────────────────
  protected dishSetPageSize(s: number): void {
    const c = this.dishQuerySubject.getValue();
    if (c.limit === s) return;
    this.dishQuerySubject.next({ ...c, page: 0, limit: s });
  }
  protected dishPrev(): void {
    const c = this.dishQuerySubject.getValue();
    if (c.page > 0) this.dishQuerySubject.next({ ...c, page: c.page - 1 });
  }
  protected dishNext(): void {
    const c = this.dishQuerySubject.getValue();
    if (this.dishLatestState && c.page < this.dishLatestState.totalPages - 1)
      this.dishQuerySubject.next({ ...c, page: c.page + 1 });
  }
  protected dishCanPrev(s: PageViewState<DishListItem> | null): boolean {
    return !!s && s.currentPage > 0 && !s.isLoading;
  }
  protected dishCanNext(s: PageViewState<DishListItem> | null): boolean {
    return !!s && s.currentPage < s.totalPages - 1 && !s.isLoading;
  }

  // ── Dish dialogs ───────────────────────────────────────────────────────────
  protected openDishCreateDialog(): void {
    this.dialogService
      .open<DishCreateRequest | null>(new PolymorpheusComponent(DishFormDialog, this.injector), {
        data: { mode: 'create', dish: null },
        size: 'auto',
        dismissible: true,
        closeable: false,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((payload) => {
        if (!payload) return;
        this.dishService
          .create(payload as DishCreateRequest)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({ next: () => this.dishRefresh(), error: (e) => console.error(e) });
      });
  }

  private openDishViewDialog(dish: DishListItem): void {
    this.dialogService
      .open<null>(new PolymorpheusComponent(DishFormDialog, this.injector), {
        data: { mode: 'view', dish },
        size: 'auto',
        dismissible: true,
        closeable: false,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  private openDishEditDialog(dish: DishListItem): void {
    this.dialogService
      .open<DishUpdateRequest | null>(new PolymorpheusComponent(DishFormDialog, this.injector), {
        data: { mode: 'edit', dish },
        size: 'auto',
        dismissible: true,
        closeable: false,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((payload) => {
        if (!payload) return;
        this.dishService
          .update(payload as DishUpdateRequest)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({ next: () => this.dishRefresh(), error: (e) => console.error(e) });
      });
  }
  private openDishDeleteDialog(dish: DishListItem): void {
    this.dialogService
      .open<boolean>(new PolymorpheusComponent(DishDeleteDialog, this.injector), {
        data: { dish },
        size: 's',
        dismissible: true,
        closeable: false,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((ok) => {
        if (!ok) return;
        this.dishService
          .delete(dish.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({ next: () => this.dishRefresh(), error: (e) => console.error(e) });
      });
  }
  private dishRefresh(): void {
    this.dishQuerySubject.next(this.dishQuerySubject.getValue());
  }

  // ── Dish API ───────────────────────────────────────────────────────────────
  private fetchDishes(q: DishQuery): Observable<PageViewState<DishListItem>> {
    const isActive =
      q.filters.isActive === 'true' ? true : q.filters.isActive === 'false' ? false : undefined;
    const req: DishSearchRequest = {
      page: q.page,
      limit: q.limit,
      sortField: q.sortField,
      sortDir: q.sortDir,
      dishCode: q.filters.dishCode || undefined,
      dishName: q.filters.dishName || undefined,
      isActive,
    };
    return this.dishService.search(req).pipe(
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
          error: 'Không thể tải danh sách món ăn.',
          rowData: [],
          currentPage: 0,
          pageSize: q.limit,
          totalElements: 0,
          totalPages: 1,
        }),
      ),
    );
  }

  // ── Shared formatters & helpers ────────────────────────────────────────────
  private readonly imgBaseUrl = `${new URL(environment.apiUrl).origin}/`;

  /**
   * Nếu photo là đường dẫn tương đối (không bắt đầu bằng http/https/blob)
   * thì ghép với baseUrl của server. Ngược lại giữ nguyên.
   */
  resolvePhotoUrl(photo: string): string {
    if (!photo) return '';
    if (photo.startsWith('http') || photo.startsWith('blob:') || photo.startsWith('//'))
      return photo;
    return this.imgBaseUrl + photo;
  }

  private fmtDT(iso: string): string {
    if (!iso) return '-';
    return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(
      new Date(iso),
    );
  }
  private fmtCurrency(v: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);
  }
}
