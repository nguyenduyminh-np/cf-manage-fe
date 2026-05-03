import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
  computed,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { TuiButton, TuiDialogContext } from '@taiga-ui/core';
import { injectContext } from '@taiga-ui/polymorpheus';

import {
  PurchaseOrderCreateRequest,
  PurchaseOrderDetail,
  PurchaseOrderDetailItem,
  PurchaseOrderUpdateDetail,
  PurchaseOrderUpdateRequest,
} from '../../../../core/models/purchase-order/purchase-order.model';

// ── Option interfaces ─────────────────────────────────────────────────────────
interface SupplierOption {
  id: number;
  supplierName: string;
}

interface WarehouseOption {
  id: number;
  warehouseName: string;
}

interface IngredientOption {
  id: number;
  ingredientName: string;
  unit?: string;
}

interface ApiListResponse<T> {
  status: number;
  message: string;
  data: T[];
}

// ── Dialog input ──────────────────────────────────────────────────────────────
export interface PurchaseOrderFormDialogInput {
  mode: 'create' | 'edit';
  order: PurchaseOrderDetail | null;
}

// ── Detail row model ──────────────────────────────────────────────────────────
interface DetailRow {
  id?: number | null;
  ingredientId: number;
  quantity: number;
  unitPrice: number;
}

const PAYMENT_STATUS_OPTIONS = [
  { label: 'Nháp', value: 'DRAFT' },
  { label: 'Chờ duyệt', value: 'PENDING' },
  { label: 'Đã duyệt', value: 'APPROVED' },
];

@Component({
  standalone: true,
  selector: 'app-purchase-order-form-dialog',
  imports: [FormsModule, TuiButton],
  templateUrl: './purchase-order-form-dialog.html',
  styleUrl: './purchase-order-form-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PurchaseOrderFormDialog implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly BASE = 'http://localhost:8080/api/v1';

  protected readonly context = injectContext<
    TuiDialogContext<
      PurchaseOrderCreateRequest | PurchaseOrderUpdateRequest | null,
      PurchaseOrderFormDialogInput
    >
  >();

  protected readonly isEdit = this.context.data.mode === 'edit';

  // ── Options ───────────────────────────────────────────────────────────────
  protected readonly suppliers = signal<SupplierOption[]>([]);
  protected readonly warehouses = signal<WarehouseOption[]>([]);
  protected readonly ingredients = signal<IngredientOption[]>([]);
  protected readonly loading = signal(true);
  protected readonly statusOptions = PAYMENT_STATUS_OPTIONS;

  // ── Form ──────────────────────────────────────────────────────────────────
  protected supplierId: number = this.context.data.order?.id ?? 0;
  protected warehouseId: number = 0;
  protected paymentStatus: string = 'DRAFT';
  protected orderDate: string = '';
  protected details: DetailRow[] = [{ ingredientId: 0, quantity: 1, unitPrice: 0 }];

  // ── Computed total ─────────────────────────────────────────────────────────
  protected readonly totalPrice = computed(() => {
    // trigger reactivity via ingredients signal read
    void this.ingredients();
    return this.calcTotal();
  });

  protected calcTotal(): number {
    return this.details.reduce((s, d) => s + d.quantity * d.unitPrice, 0);
  }

  ngOnInit(): void {
    // Load all option lists in parallel
    Promise.all([
      this.fetchList<SupplierOption>(`${this.BASE}/supplier/options`),
      this.fetchList<WarehouseOption>(`${this.BASE}/warehouse/options`),
      this.fetchList<IngredientOption>(`${this.BASE}/ingredient/options`),
    ]).then(([sups, whs, ings]) => {
      this.suppliers.set(sups);
      this.warehouses.set(whs);
      this.ingredients.set(ings);
      this.loading.set(false);
      this.initForm();
    }).catch(() => {
      this.loading.set(false);
      this.initForm();
    });
  }

  private fetchList<T>(url: string): Promise<T[]> {
    return this.http.get<ApiListResponse<T>>(url).toPromise()
      .then(r => r?.data ?? [])
      .catch(() => []);
  }

  private initForm(): void {
    const o = this.context.data.order;
    if (!o) return;

    // Tìm supplierId từ supplierName
    const sup = this.suppliers().find(s => s.supplierName === o.supplierName);
    this.supplierId = sup?.id ?? 0;

    const wh = this.warehouses().find(w => w.warehouseName === o.warehouseName);
    this.warehouseId = wh?.id ?? 0;

    this.paymentStatus = o.paymentStatus ?? 'DRAFT';
    this.orderDate = o.orderDate ? o.orderDate.substring(0, 10) : '';

    if (o.details?.length) {
      this.details = o.details.map(d => ({
        id: d.id,
        ingredientId: d.ingredientId,
        quantity: d.quantity,
        unitPrice: d.unitPrice,
      }));
    }
  }

  // ── Detail rows management ─────────────────────────────────────────────────
  protected addRow(): void {
    this.details = [...this.details, { ingredientId: 0, quantity: 1, unitPrice: 0 }];
  }

  protected removeRow(index: number): void {
    if (this.details.length <= 1) return;
    this.details = this.details.filter((_, i) => i !== index);
  }

  protected onDetailChange(): void {
    // Force change detection for total
    this.ingredients.set([...this.ingredients()]);
  }

  protected ingredientName(id: number): string {
    return this.ingredients().find(i => i.id === id)?.ingredientName ?? '';
  }

  // ── Validation ────────────────────────────────────────────────────────────
  protected get isValid(): boolean {
    if (!this.supplierId || !this.warehouseId || !this.paymentStatus) return false;
    if (!this.details.length) return false;
    return this.details.every(d => d.ingredientId > 0 && d.quantity > 0 && d.unitPrice > 0);
  }

  // ── Format helpers ─────────────────────────────────────────────────────────
  protected fmtCurrency(v: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  protected submit(): void {
    if (!this.isValid) return;

    if (this.isEdit) {
      const payload: PurchaseOrderUpdateRequest = {
        id: this.context.data.order!.id,
        supplierId: this.supplierId,
        warehouseId: this.warehouseId,
        paymentStatus: this.paymentStatus,
        orderDate: this.orderDate || undefined,
        details: this.details.map(
          (d): PurchaseOrderUpdateDetail => ({
            id: d.id ?? null,
            ingredientId: d.ingredientId,
            quantity: d.quantity,
            unitPrice: d.unitPrice,
          }),
        ),
      };
      this.context.completeWith(payload);
    } else {
      const payload: PurchaseOrderCreateRequest = {
        totalPrice: this.calcTotal(),
        paymentStatus: this.paymentStatus,
        supplierId: this.supplierId,
        warehouseId: this.warehouseId,
        orderDate: this.orderDate || undefined,
        details: this.details.map(
          (d): PurchaseOrderDetailItem => ({
            ingredientId: d.ingredientId,
            quantity: d.quantity,
            unitPrice: d.unitPrice,
          }),
        ),
      };
      this.context.completeWith(payload);
    }
  }

  protected cancel(): void {
    this.context.completeWith(null);
  }
}
