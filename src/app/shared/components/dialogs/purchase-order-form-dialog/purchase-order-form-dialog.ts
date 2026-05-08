import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TuiButton, TuiDialogContext } from '@taiga-ui/core';
import { injectContext } from '@taiga-ui/polymorpheus';
import { firstValueFrom } from 'rxjs';

import {
  PurchaseOrderCreateRequest,
  PurchaseOrderDetail,
  PurchaseOrderDetailItem,
  PurchaseOrderDetailItemResponse,
  PurchaseOrderIngredientOption,
  PurchaseOrderSupplierOption,
  PurchaseOrderUpdateDetail,
  PurchaseOrderUpdateRequest,
  PurchaseOrderWarehouseOption,
} from '../../../../core/models/purchase-order/purchase-order.model';
import { PurchaseOrderService } from '../../../../core/services/purchase-order/purchase-order.model';
import {
  UiSelectComponent,
  UiSelectOption,
} from '../../ui-component/ui-select/ui-select';

export interface PurchaseOrderFormDialogInput {
  mode: 'create' | 'edit';
  order: PurchaseOrderDetail | null;
}

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
] as const;

@Component({
  standalone: true,
  selector: 'app-purchase-order-form-dialog',
  imports: [FormsModule, TuiButton, UiSelectComponent],
  templateUrl: './purchase-order-form-dialog.html',
  styleUrl: './purchase-order-form-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PurchaseOrderFormDialog implements OnInit {
  private readonly poService = inject(PurchaseOrderService);

  protected readonly context = injectContext<
    TuiDialogContext<
      PurchaseOrderCreateRequest | PurchaseOrderUpdateRequest | null,
      PurchaseOrderFormDialogInput
    >
  >();

  protected readonly isEdit = this.context.data.mode === 'edit';
  protected readonly suppliers = signal<PurchaseOrderSupplierOption[]>([]);
  protected readonly warehouses = signal<PurchaseOrderWarehouseOption[]>([]);
  protected readonly ingredients = signal<PurchaseOrderIngredientOption[]>([]);
  protected readonly loading = signal(true);
  protected readonly ingredientsLoading = signal(false);
  protected readonly ingredientError = signal<string | null>(null);
  protected readonly statusOptions = PAYMENT_STATUS_OPTIONS;

  protected readonly supplierSelectOptions = computed<UiSelectOption<number>[]>(() =>
    this.suppliers().map((supplier) => ({
      value: supplier.id,
      label: supplier.supplierCode
        ? `${supplier.supplierName} (${supplier.supplierCode})`
        : supplier.supplierName,
    })),
  );

  protected readonly warehouseSelectOptions = computed<UiSelectOption<number>[]>(() =>
    this.warehouses().map((warehouse) => ({
      value: warehouse.id,
      label: warehouse.warehouseCode
        ? `${warehouse.warehouseName} (${warehouse.warehouseCode})`
        : warehouse.warehouseName,
    })),
  );

  protected readonly statusSelectOptions: ReadonlyArray<UiSelectOption<string>> =
    PAYMENT_STATUS_OPTIONS;

  protected supplierId = 0;
  protected warehouseId = 0;
  protected paymentStatus = 'DRAFT';
  protected orderDate = '';
  protected details: DetailRow[] = [this.createEmptyRow()];

  ngOnInit(): void {
    void this.initializeDialog();
  }

  protected async onSupplierChanged(value: number | string | null): Promise<void> {
    const nextSupplierId = this.toPositiveId(value);
    if (nextSupplierId === this.supplierId) {
      return;
    }

    this.supplierId = nextSupplierId;

    if (!nextSupplierId) {
      this.ingredients.set([]);
      this.ingredientError.set(null);
      this.resetDetailRows();
      return;
    }

    this.resetDetailRows();
    await this.loadIngredientsBySupplier(nextSupplierId);
  }

  protected onWarehouseChanged(value: number | string | null): void {
    this.warehouseId = this.toPositiveId(value);
  }

  protected onPaymentStatusChanged(value: string | number | null): void {
    this.paymentStatus = typeof value === 'string' ? value : 'DRAFT';
  }

  protected addRow(): void {
    if (!this.canAddDetailRow()) {
      return;
    }

    this.details = [...this.details, this.createEmptyRow()];
  }

  protected removeRow(index: number): void {
    if (this.details.length <= 1) {
      return;
    }

    this.details = this.details.filter((_, i) => i !== index);
  }

  protected ingredientLabel(option: PurchaseOrderIngredientOption): string {
    return option.ingredientCode
      ? `${option.ingredientName} (${option.ingredientCode})`
      : option.ingredientName;
  }

  protected canAddDetailRow(): boolean {
    return this.supplierId > 0 && !this.ingredientsLoading() && this.ingredients().length > 0;
  }

  protected get isValid(): boolean {
    if (!this.supplierId || !this.warehouseId || !this.paymentStatus || !this.details.length) {
      return false;
    }

    const ingredientIds = new Set(this.ingredients().map((item) => item.ingredientId));

    return this.details.every(
      (detail) =>
        ingredientIds.has(detail.ingredientId) &&
        detail.quantity > 0 &&
        detail.unitPrice >= 10000,
    );
  }

  protected fmtCurrency(value: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  }

  protected calcTotal(): number {
    return this.details.reduce((sum, detail) => sum + detail.quantity * detail.unitPrice, 0);
  }

  protected submit(): void {
    if (!this.isValid) {
      return;
    }

    if (this.isEdit) {
      const payload: PurchaseOrderUpdateRequest = {
        id: this.context.data.order!.id,
        totalPrice: this.calcTotal(),
        supplierId: this.supplierId,
        warehouseId: this.warehouseId,
        paymentStatus: this.paymentStatus,
        orderDate: this.normalizeOrderDateForSubmit(),
        details: this.details.map(
          (detail): PurchaseOrderUpdateDetail => ({
            id: detail.id ?? null,
            ingredientId: detail.ingredientId,
            quantity: detail.quantity,
            unitPrice: detail.unitPrice,
          }),
        ),
      };

      this.context.completeWith(payload);
      return;
    }

    const payload: PurchaseOrderCreateRequest = {
      totalPrice: this.calcTotal(),
      paymentStatus: this.paymentStatus,
      supplierId: this.supplierId,
      warehouseId: this.warehouseId,
      orderDate: this.normalizeOrderDateForSubmit(),
      details: this.details.map(
        (detail): PurchaseOrderDetailItem => ({
          ingredientId: detail.ingredientId,
          quantity: detail.quantity,
          unitPrice: detail.unitPrice,
        }),
      ),
    };

    this.context.completeWith(payload);
  }

  protected cancel(): void {
    this.context.completeWith(null);
  }

  private async initializeDialog(): Promise<void> {
    try {
      const [suppliers, warehouses] = await Promise.all([
        this.fetchSupplierOptions(),
        this.fetchWarehouseOptions(),
      ]);

      this.suppliers.set(suppliers);
      this.warehouses.set(warehouses);

      await this.prefillEditForm();
    } finally {
      this.loading.set(false);
    }
  }

  private async prefillEditForm(): Promise<void> {
    const order = this.context.data.order;
    if (!order) {
      return;
    }

    this.supplierId = order.supplierId ?? 0;
    this.warehouseId = order.warehouseId ?? 0;
    this.paymentStatus = order.paymentStatus ?? 'DRAFT';
    this.orderDate = order.orderDate ? order.orderDate.substring(0, 10) : '';
    this.details =
      order.details?.length > 0
        ? order.details.map((detail) => ({
            id: detail.id,
            ingredientId: detail.ingredientId,
            quantity: detail.quantity,
            unitPrice: detail.unitPrice,
          }))
        : [this.createEmptyRow()];

    if (this.supplierId > 0) {
      await this.loadIngredientsBySupplier(this.supplierId, order.details);
    }
  }

  private async loadIngredientsBySupplier(
    supplierId: number,
    existingDetails: PurchaseOrderDetailItemResponse[] = [],
  ): Promise<void> {
    this.ingredientsLoading.set(true);
    this.ingredientError.set(null);

    try {
      const options = await this.fetchIngredientOptionsBySupplier(supplierId);
      this.ingredients.set(this.mergeIngredientOptions(options, existingDetails, supplierId));
    } catch {
      this.ingredients.set([]);
      this.ingredientError.set(
        'Không thể tải danh sách nguyên liệu theo nhà cung cấp. Vui lòng chọn lại nhà cung cấp.',
      );
    } finally {
      this.ingredientsLoading.set(false);
    }
  }

  private mergeIngredientOptions(
    options: PurchaseOrderIngredientOption[],
    existingDetails: PurchaseOrderDetailItemResponse[],
    supplierId: number,
  ): PurchaseOrderIngredientOption[] {
    if (!existingDetails.length) {
      return options;
    }

    const merged = [...options];
    const seen = new Set(merged.map((item) => item.ingredientId));

    for (const detail of existingDetails) {
      if (seen.has(detail.ingredientId)) {
        continue;
      }

      merged.push({
        ingredientId: detail.ingredientId,
        ingredientCode: detail.ingredientCode,
        ingredientName: detail.ingredientName ?? `Nguyên liệu #${detail.ingredientId}`,
        supplierId: detail.supplierId ?? supplierId,
      });
      seen.add(detail.ingredientId);
    }

    return merged;
  }

  private resetDetailRows(): void {
    this.details = [this.createEmptyRow()];
  }

  private createEmptyRow(): DetailRow {
    return {
      ingredientId: 0,
      quantity: 1,
      unitPrice: 0,
    };
  }

  private normalizeOrderDateForSubmit(): string | undefined {
    if (!this.orderDate) {
      return undefined;
    }

    return `${this.orderDate}T00:00:00.000Z`;
  }

  private toPositiveId(value: number | string | null | undefined): number {
    const normalized = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(normalized) && normalized > 0 ? normalized : 0;
  }

  private async fetchSupplierOptions(): Promise<PurchaseOrderSupplierOption[]> {
    try {
      const response = await firstValueFrom(this.poService.getSupplierOptions());
      return response.data ?? [];
    } catch {
      return [];
    }
  }

  private async fetchWarehouseOptions(): Promise<PurchaseOrderWarehouseOption[]> {
    try {
      const response = await firstValueFrom(this.poService.getWarehouseOptions());
      return response.data ?? [];
    } catch {
      return [];
    }
  }

  private async fetchIngredientOptionsBySupplier(
    supplierId: number,
  ): Promise<PurchaseOrderIngredientOption[]> {
    const response = await firstValueFrom(this.poService.getIngredientsBySupplier(supplierId));
    return response.data ?? [];
  }
}
