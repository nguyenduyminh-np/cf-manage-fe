import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TuiButton, TuiDialogContext } from '@taiga-ui/core';
import { injectContext } from '@taiga-ui/polymorpheus';

import {
  WarehouseCreateRequest,
  WarehouseListItem,
  WarehouseUpdateRequest,
} from '../../../../../core/models/warehouse/warehouse.model';

export interface WarehouseFormDialogInput {
  mode: 'create' | 'edit' | 'view';
  warehouse: WarehouseListItem | null;
}

@Component({
  standalone: true,
  selector: 'app-warehouse-form-dialog',
  imports: [FormsModule, TuiButton],
  templateUrl: './warehouse-form-dialog.html',
  styleUrl: './warehouse-form-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WarehouseFormDialog {
  protected readonly context =
    injectContext<
      TuiDialogContext<
        WarehouseCreateRequest | WarehouseUpdateRequest | null,
        WarehouseFormDialogInput
      >
    >();

  protected readonly isEdit = this.context.data.mode === 'edit';
  protected readonly isView = this.context.data.mode === 'view';
  private readonly src = this.context.data.warehouse;

  // ── Form data ─────────────────────────────────────────────────────────────
  protected formData = {
    id: this.src?.id ?? 0,
    warehouseCode: this.src?.warehouseCode ?? '',
    warehouseName: this.src?.warehouseName ?? '',
    location: this.src?.location ?? '',
    note: this.src?.note ?? '',
    active: this.src?.active ?? true,
  };

  // ── Validation ─────────────────────────────────────────────────────────────
  protected get isValid(): boolean {
    return !!this.formData.warehouseName.trim();
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  protected submit(): void {
    if (this.isView || !this.isValid) return;

    if (this.isEdit) {
      const payload: WarehouseUpdateRequest = {
        id: this.formData.id,
        warehouseCode: this.formData.warehouseCode.trim() || undefined,
        warehouseName: this.formData.warehouseName.trim(),
        location: this.formData.location.trim() || undefined,
        note: this.formData.note.trim() || undefined,
        active: this.formData.active,
      };
      this.context.completeWith(payload);
    } else {
      const payload: WarehouseCreateRequest = {
        warehouseCode: this.formData.warehouseCode.trim() || undefined,
        warehouseName: this.formData.warehouseName.trim(),
        location: this.formData.location.trim() || undefined,
        note: this.formData.note.trim() || undefined,
      };
      this.context.completeWith(payload);
    }
  }

  protected cancel(): void {
    this.context.completeWith(null);
  }
}
