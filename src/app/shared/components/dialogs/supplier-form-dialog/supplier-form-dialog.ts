import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TuiButton, TuiDialogContext } from '@taiga-ui/core';
import { injectContext } from '@taiga-ui/polymorpheus';

import {
  SupplierCreateRequest,
  SupplierListItem,
  SupplierUpdateRequest,
} from '../../../../core/models/supplier/supplier.model';

export interface SupplierFormDialogInput {
  mode: 'create' | 'edit' | 'view';
  supplier: SupplierListItem | null;
}

@Component({
  standalone: true,
  selector: 'app-supplier-form-dialog',
  imports: [FormsModule, TuiButton],
  templateUrl: './supplier-form-dialog.html',
  styleUrl: './supplier-form-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupplierFormDialog {
  protected readonly context = injectContext<
    TuiDialogContext<SupplierCreateRequest | SupplierUpdateRequest | null, SupplierFormDialogInput>
  >();

  protected readonly isEdit = this.context.data.mode === 'edit';
  protected readonly isView = this.context.data.mode === 'view';
  private readonly src = this.context.data.supplier;

  // ── Form data ─────────────────────────────────────────────────────────────
  protected formData = {
    id:           this.src?.id ?? 0,
    supplierCode: this.src?.supplierCode ?? '',
    supplierName: this.src?.supplierName ?? '',
    contactInfo:  this.src?.contactInfo ?? '',
    address:      this.src?.address ?? '',
    active:       this.src?.active ?? true,
  };

  // ── Validation ─────────────────────────────────────────────────────────────
  protected get isValid(): boolean {
    return !!this.formData.supplierName.trim() && !!this.formData.contactInfo.trim();
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  protected submit(): void {
    if (this.isView || !this.isValid) return;

    if (this.isEdit) {
      const payload: SupplierUpdateRequest = {
        id:           this.formData.id,
        supplierCode: this.formData.supplierCode.trim() || undefined,
        supplierName: this.formData.supplierName.trim(),
        contactInfo:  this.formData.contactInfo.trim(),
        address:      this.formData.address.trim() || undefined,
        active:       this.formData.active,
      };
      this.context.completeWith(payload);
    } else {
      const payload: SupplierCreateRequest = {
        supplierCode: this.formData.supplierCode.trim() || undefined,
        supplierName: this.formData.supplierName.trim(),
        contactInfo:  this.formData.contactInfo.trim(),
        address:      this.formData.address.trim() || undefined,
      };
      this.context.completeWith(payload);
    }
  }

  protected cancel(): void {
    this.context.completeWith(null);
  }
}
