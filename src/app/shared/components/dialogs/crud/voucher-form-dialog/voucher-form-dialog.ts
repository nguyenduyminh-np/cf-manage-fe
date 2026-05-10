import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TuiButton, TuiDialogContext } from '@taiga-ui/core';
import { injectContext } from '@taiga-ui/polymorpheus';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  VoucherListItem,
  VoucherCreateRequest,
  VoucherPreviewResult,
} from '../../../../../core/models/voucher/voucher.model';
import { VoucherService } from '../../../../../core/services/voucher/voucher.service';

export interface VoucherFormDialogInput {
  mode: 'create' | 'view';
  voucher: VoucherListItem | null;
}

@Component({
  standalone: true,
  selector: 'app-voucher-form-dialog',
  imports: [FormsModule, TuiButton, CommonModule],
  templateUrl: './voucher-form-dialog.html',
  styleUrl: './voucher-form-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VoucherFormDialog {
  protected readonly context =
    injectContext<TuiDialogContext<VoucherCreateRequest | null, VoucherFormDialogInput>>();

  private readonly voucherService = inject(VoucherService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly isView = this.context.data.mode === 'view';
  protected readonly src = this.context.data.voucher;

  // ── Form data ──────────────────────────────────────────────────────────────
  protected formData = {
    code: this.src?.code ?? '',
    description: this.src?.description ?? '',
    discountType: (this.src?.discountType ?? 'PERCENT') as 'PERCENT' | 'FIXED',
    discountValue: this.src?.discountValue ?? 0,
    minOrderAmount: this.src?.minOrderAmount ?? null as number | null,
    maxDiscount: this.src?.maxDiscount ?? null as number | null,
    usageLimit: this.src?.usageLimit ?? null as number | null,
    startDate: this.src?.startDate ? this.toLocalDatetimeInput(this.src.startDate) : '',
    endDate: this.src?.endDate ? this.toLocalDatetimeInput(this.src.endDate) : '',
  };

  // ── Preview state ──────────────────────────────────────────────────────────
  protected readonly previewing = signal(false);
  protected previewResult: VoucherPreviewResult | null = null;
  protected previewError: string | null = null;
  protected previewAmount = '';

  // ── Validation ─────────────────────────────────────────────────────────────
  protected get isValid(): boolean {
    const codeOk = /^[A-Z0-9_-]{1,50}$/i.test(this.formData.code.trim());
    const valOk = this.formData.discountValue > 0
      && (this.formData.discountType !== 'PERCENT' || this.formData.discountValue <= 100);
    return codeOk && valOk;
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  protected submit(): void {
    if (this.isView || !this.isValid) return;

    const payload: VoucherCreateRequest = {
      code: this.formData.code.trim().toUpperCase(),
      description: this.formData.description.trim() || undefined,
      discountType: this.formData.discountType,
      discountValue: Number(this.formData.discountValue),
      minOrderAmount: this.formData.minOrderAmount != null ? Number(this.formData.minOrderAmount) : null,
      maxDiscount: this.formData.discountType === 'PERCENT' && this.formData.maxDiscount != null
        ? Number(this.formData.maxDiscount) : null,
      usageLimit: this.formData.usageLimit != null ? Number(this.formData.usageLimit) : null,
      startDate: this.formData.startDate ? new Date(this.formData.startDate).toISOString() : null,
      endDate: this.formData.endDate ? new Date(this.formData.endDate).toISOString() : null,
    };

    this.context.completeWith(payload);
  }

  protected cancel(): void {
    this.context.completeWith(null);
  }

  // ── Preview (Admin test) ───────────────────────────────────────────────────
  protected runPreview(): void {
    const code = this.isView ? this.src?.code ?? '' : this.formData.code.trim().toUpperCase();
    const amount = parseFloat(this.previewAmount);
    if (!code || isNaN(amount) || amount <= 0) return;

    this.previewing.set(true);
    this.previewResult = null;
    this.previewError = null;

    this.voucherService
      .previewDiscount(code, amount)
      .pipe(
        finalize(() => { this.previewing.set(false); this.cdr.markForCheck(); }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (r) => { this.previewResult = r.data; this.cdr.markForCheck(); },
        error: (err) => {
          this.previewError = err?.error?.message ?? 'Không thể preview voucher.';
          this.cdr.markForCheck();
        },
      });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  protected fmtCurrency(val: number | null): string {
    if (val == null) return '—';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  }

  protected fmtDT(iso: string | null): string {
    if (!iso) return '—';
    return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
  }

  private toLocalDatetimeInput(iso: string): string {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
}
