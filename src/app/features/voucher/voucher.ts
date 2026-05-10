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
  ValueFormatterParams,
  ValueGetterParams,
} from 'ag-grid-community';
import { TuiAlertService, TuiDialogService } from '@taiga-ui/core';
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

import { VoucherListItem, VoucherCreateRequest } from '../../core/models/voucher/voucher.model';
import { VoucherService } from '../../core/services/voucher/voucher.service';
import { VoucherFormDialog } from '../../shared/components/dialogs/crud/voucher-form-dialog/voucher-form-dialog';
import { VoucherDeactivateDialog } from '../../shared/components/dialogs/crud/voucher-deactivate-dialog/voucher-deactivate-dialog';
import { BreadcrumbComponent } from '../../shared/components/ui-component/breadcrumb/breadcrumb';
import { UiSelectComponent } from '../../shared/components/ui-component/ui-select/ui-select';

// ── View-state ────────────────────────────────────────────────────────────────
interface VoucherViewState {
  isLoading: boolean;
  error: string | null;
  all: VoucherListItem[];       // toàn bộ dữ liệu từ API
  filtered: VoucherListItem[];  // sau khi lọc
}

@Component({
  standalone: true,
  selector: 'app-voucher',
  imports: [AsyncPipe, AgGridAngular, FormsModule, BreadcrumbComponent, UiSelectComponent],
  templateUrl: './voucher.html',
  styleUrl: './voucher.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Voucher implements OnDestroy {
  private readonly voucherService = inject(VoucherService);
  private readonly dialogService = inject(TuiDialogService);
  private readonly alertService = inject(TuiAlertService);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);

  // ── RAF / debounce ─────────────────────────────────────────────────────────
  private fitRafId: number | null = null;

  ngOnDestroy(): void {
    if (this.fitRafId !== null) cancelAnimationFrame(this.fitRafId);
  }

  // ── Filter options ─────────────────────────────────────────────────────────
  protected readonly activeStatusOptions = [
    { label: 'Tất cả', value: '' },
    { label: 'Đang hoạt động', value: 'true' },
    { label: 'Đã vô hiệu hóa', value: 'false' },
  ];

  protected readonly discountTypeOptions = [
    { label: 'Tất cả', value: '' },
    { label: 'Phần trăm (%)', value: 'PERCENT' },
    { label: 'Cố định (VNĐ)', value: 'FIXED' },
  ];

  // ── Search filters ─────────────────────────────────────────────────────────
  protected searchCode = '';
  protected filterActive = '';
  protected filterType = '';

  // ── Reload trigger ─────────────────────────────────────────────────────────
  private readonly reloadSubject = new BehaviorSubject<void>(undefined);

  // ── State stream ──────────────────────────────────────────────────────────
  protected readonly state$: Observable<VoucherViewState> = this.reloadSubject.pipe(
    switchMap(() => this.fetchVouchers()),
    tap((s) => (this.latestAll = s.all)),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  private latestAll: VoucherListItem[] = [];
  private gridApi: GridApi<VoucherListItem> | null = null;

  // ── Column defs ───────────────────────────────────────────────────────────
  protected readonly columnDefs: ColDef<VoucherListItem>[] = [
    {
      headerName: 'STT',
      valueGetter: (p: ValueGetterParams<VoucherListItem>) => (p.node?.rowIndex ?? 0) + 1,
      flex: 0.45,
      minWidth: 64,
      maxWidth: 80,
      pinned: 'left',
      sortable: false,
      filter: false,
      cellClass: 'cell-center cell-bold',
    },
    {
      headerName: 'Mã voucher',
      field: 'code',
      minWidth: 160,
      flex: 1.2,
      sortable: true,
      filter: true,
      cellRenderer: (p: ICellRendererParams<VoucherListItem>) => {
        const code = p.data?.code ?? '—';
        return `<span class="voucher-code-cell">${code}</span>`;
      },
    },
    {
      headerName: 'Loại',
      field: 'discountType',
      minWidth: 130,
      flex: 0.9,
      sortable: false,
      filter: false,
      cellRenderer: (p: ICellRendererParams<VoucherListItem>) => {
        const t = p.data?.discountType;
        return t === 'PERCENT'
          ? `<span class="type-badge type-badge--percent"><span class="material-symbols-outlined">percent</span>Phần trăm</span>`
          : `<span class="type-badge type-badge--fixed"><span class="material-symbols-outlined">currency_exchange</span>Cố định</span>`;
      },
    },
    {
      headerName: 'Giá trị giảm',
      field: 'discountValue',
      minWidth: 140,
      flex: 1,
      sortable: true,
      filter: false,
      cellRenderer: (p: ICellRendererParams<VoucherListItem>) => {
        const v = p.data;
        if (!v) return '—';
        return v.discountType === 'PERCENT'
          ? `<strong>${v.discountValue}%</strong>`
          : `<strong>${this.fmtCurrency(v.discountValue)}</strong>`;
      },
    },
    {
      headerName: 'Đơn tối thiểu',
      field: 'minOrderAmount',
      minWidth: 150,
      flex: 1,
      sortable: false,
      filter: false,
      valueFormatter: (p: ValueFormatterParams<VoucherListItem>) =>
        p.value != null ? this.fmtCurrency(p.value) : '—',
    },
    {
      headerName: 'Đã dùng / Giới hạn',
      colId: 'usage',
      minWidth: 165,
      flex: 1,
      sortable: false,
      filter: false,
      cellRenderer: (p: ICellRendererParams<VoucherListItem>) => {
        const v = p.data;
        if (!v) return '—';
        const used = v.usedCount;
        const limit = v.usageLimit ?? null;
        const pct = limit ? Math.round((used / limit) * 100) : 0;
        const fill = limit ? `<div class="usage-bar__fill" style="width:${Math.min(pct, 100)}%"></div>` : '';
        return `<div class="usage-cell">
          <span class="usage-cell__text">${used} / ${limit ?? '∞'}</span>
          ${limit ? `<div class="usage-bar">${fill}</div>` : ''}
        </div>`;
      },
    },
    {
      headerName: 'Hiệu lực',
      colId: 'validity',
      minWidth: 200,
      flex: 1.4,
      sortable: false,
      filter: false,
      cellRenderer: (p: ICellRendererParams<VoucherListItem>) => {
        const v = p.data;
        if (!v) return '—';
        const start = v.startDate ? this.fmtDate(v.startDate) : 'Ngay lập tức';
        const end = v.endDate ? this.fmtDate(v.endDate) : 'Không hết hạn';
        return `<span class="validity-cell">${start} → ${end}</span>`;
      },
    },
    {
      headerName: 'Trạng thái',
      field: 'active',
      minWidth: 165,
      flex: 1,
      sortable: false,
      filter: false,
      cellRenderer: (p: ICellRendererParams<VoucherListItem>) => {
        const ok = p.value === true;
        return `<span class="status-badge status-badge--${ok ? 'active' : 'inactive'}">${ok ? 'Đang hoạt động' : 'Đã vô hiệu hóa'}</span>`;
      },
    },
    {
      headerName: 'Ngày tạo',
      field: 'createdAt',
      minWidth: 160,
      flex: 1.1,
      sortable: true,
      filter: false,
      valueFormatter: (p: ValueFormatterParams<VoucherListItem>) => this.fmtDT(p.value),
    },
    {
      headerName: 'Thao tác',
      colId: 'voucher-actions',
      cellRenderer: (p: ICellRendererParams<VoucherListItem>) => {
        const isActive = p.data?.active;
        return (
          `<span class="material-symbols-outlined action-icon action-icon--view" data-action="view" title="Xem chi tiết">visibility</span>` +
          (isActive
            ? `<span class="material-symbols-outlined action-icon action-icon--delete" data-action="deactivate" title="Vô hiệu hóa">block</span>`
            : `<span class="material-symbols-outlined action-icon action-icon--disabled" title="Đã vô hiệu hóa">block</span>`)
        );
      },
      width: 120,
      minWidth: 120,
      maxWidth: 140,
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
  protected onGridReady(e: GridReadyEvent<VoucherListItem>): void {
    this.gridApi = e.api;
    this.fitGrid();
  }
  protected onGridSizeChanged(_e: GridSizeChangedEvent<VoucherListItem>): void {
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

  protected onCellClicked(e: CellClickedEvent<VoucherListItem>): void {
    if (e.colDef.colId !== 'voucher-actions' || !e.data) return;
    const action = (e.event?.target as HTMLElement)
      ?.closest('[data-action]')
      ?.getAttribute('data-action');
    if (action === 'view') this.openViewDialog(e.data);
    else if (action === 'deactivate') this.openDeactivateDialog(e.data);
  }

  // ── Client-side search / filter ───────────────────────────────────────────
  protected applyFilter(all: VoucherListItem[]): VoucherListItem[] {
    let result = [...all];
    if (this.searchCode.trim()) {
      const term = this.searchCode.trim().toUpperCase();
      result = result.filter((v) => v.code.includes(term));
    }
    if (this.filterActive !== '') {
      const active = this.filterActive === 'true';
      result = result.filter((v) => v.active === active);
    }
    if (this.filterType !== '') {
      result = result.filter((v) => v.discountType === this.filterType);
    }
    return result;
  }

  protected resetSearch(): void {
    this.searchCode = '';
    this.filterActive = '';
    this.filterType = '';
    this.reloadSubject.next();
  }

  protected setActiveFilter(val: string | number | null): void {
    this.filterActive = typeof val === 'string' ? val : '';
    this.reloadSubject.next();
  }

  protected setTypeFilter(val: string | number | null): void {
    this.filterType = typeof val === 'string' ? val : '';
    this.reloadSubject.next();
  }

  // ── Dialogs ───────────────────────────────────────────────────────────────
  protected openCreateDialog(): void {
    this.dialogService
      .open<VoucherCreateRequest | null>(
        new PolymorpheusComponent(VoucherFormDialog, this.injector),
        { data: { mode: 'create', voucher: null }, size: 'auto', dismissible: true, closeable: false },
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((payload) => {
        if (!payload) return;
        this.voucherService
          .create(payload as VoucherCreateRequest)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.alertService
                .open('Tạo voucher thành công!', { appearance: 'positive', autoClose: 3000 })
                .subscribe();
              this.refresh();
            },
            error: (err) => {
              const msg = err?.error?.message ?? 'Không thể tạo voucher.';
              this.alertService.open(msg, { appearance: 'negative', autoClose: 5000 }).subscribe();
            },
          });
      });
  }

  private openViewDialog(v: VoucherListItem): void {
    this.dialogService
      .open<null>(new PolymorpheusComponent(VoucherFormDialog, this.injector), {
        data: { mode: 'view', voucher: v },
        size: 'auto',
        dismissible: true,
        closeable: false,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  private openDeactivateDialog(v: VoucherListItem): void {
    this.dialogService
      .open<boolean>(new PolymorpheusComponent(VoucherDeactivateDialog, this.injector), {
        data: { voucher: v },
        size: 's',
        dismissible: true,
        closeable: false,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((ok) => {
        if (!ok) return;
        this.voucherService
          .deactivate(v.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.alertService
                .open(`Đã vô hiệu hóa voucher ${v.code}.`, { appearance: 'positive', autoClose: 3000 })
                .subscribe();
              this.refresh();
            },
            error: (err) => {
              const msg = err?.error?.message ?? 'Không thể vô hiệu hóa voucher.';
              this.alertService.open(msg, { appearance: 'negative', autoClose: 5000 }).subscribe();
            },
          });
      });
  }

  private refresh(): void {
    this.reloadSubject.next();
  }

  // ── API ───────────────────────────────────────────────────────────────────
  private fetchVouchers(): Observable<VoucherViewState> {
    return this.voucherService.list().pipe(
      map((r) => {
        const all = r.data ?? [];
        return {
          isLoading: false,
          error: null,
          all,
          filtered: this.applyFilter(all),
        };
      }),
      startWith({ isLoading: true, error: null, all: [], filtered: [] }),
      catchError(() =>
        of({ isLoading: false, error: 'Không thể tải danh sách voucher.', all: [], filtered: [] }),
      ),
    );
  }

  // ── Formatters ─────────────────────────────────────────────────────────────
  protected countActive(all: VoucherListItem[]): number {
    return all.filter((v) => v.active).length;
  }

  private fmtCurrency(val: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  }

  private fmtDate(iso: string): string {
    return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short' }).format(new Date(iso));
  }

  private fmtDT(iso: string): string {
    if (!iso) return '—';
    return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
  }
}
