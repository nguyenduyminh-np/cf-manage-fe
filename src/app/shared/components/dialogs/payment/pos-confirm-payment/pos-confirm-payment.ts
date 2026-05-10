import { CommonModule, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TuiDialogContext, TuiAlertService } from '@taiga-ui/core';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import { PaymentService } from '../../../../../core/services/POS/pos-confirm-payment/pos-confirm-payment.service';
import { PaymentPreviewData, PaymentData } from '../../../../../core/models/payment/payment.model';

export type PaymentMethod = 'CASH' | 'BANK_TRANSFER';

/** Input data – component tự gọi API preview */
export interface PosConfirmPaymentInput {
  orderId: number;
  /** Mã voucher đã chọn từ màn hình đặt món (POS), có thể null */
  voucherCode?: string | null;
}

/** Kết quả trả về cho caller: null = đóng/hủy, PaymentData = thanh toán thành công */
export type PosConfirmPaymentResult = PaymentData | null;

@Component({
  standalone: true,
  selector: 'app-pos-confirm-payment',
  imports: [CommonModule, DecimalPipe, FormsModule],
  templateUrl: './pos-confirm-payment.html',
  styleUrl: './pos-confirm-payment.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PosConfirmPayment implements OnInit {
  private readonly context = inject(POLYMORPHEUS_CONTEXT, {
    optional: true,
  }) as TuiDialogContext<PosConfirmPaymentResult, PosConfirmPaymentInput> | null;

  private readonly paymentService = inject(PaymentService);
  private readonly alert = inject(TuiAlertService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  // States
  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly previewingVoucher = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly selectedMethod = signal<PaymentMethod>('CASH');

  // Voucher state
  protected voucherInput = '';
  protected appliedVoucher = '';
  protected voucherError: string | null = null;

  // Collapsible sections
  protected readonly expandedOrderInfo = signal(true);
  protected readonly expandedItemsTable = signal(true);
  protected readonly expandedVoucher = signal(true);
  protected readonly expandedPaymentMethod = signal(true);

  // Preview data loaded from API
  protected preview: PaymentPreviewData | null = null;

  private get orderId(): number {
    return this.context?.data?.orderId ?? 0;
  }

  ngOnInit(): void {
    if (!this.orderId) {
      this.error.set('Không tìm thấy mã đơn hàng.');
      this.loading.set(false);
      return;
    }
    // Nếu có voucherCode truyền từ màn hình POS → pre-populate
    const preVoucher = this.context?.data?.voucherCode;
    if (preVoucher) {
      this.voucherInput = preVoucher;
      this.appliedVoucher = preVoucher;
    }
    this.loadPreview();
  }

  protected selectMethod(method: PaymentMethod): void {
    this.selectedMethod.set(method);
  }

  protected toggleSection(sectionSignal: typeof this.expandedOrderInfo): void {
    sectionSignal.update((v) => !v);
  }

  // ── Voucher actions ────────────────────────────────────────────────────────

  protected applyVoucher(): void {
    const code = this.voucherInput.trim().toUpperCase();
    if (!code) return;
    this.previewWithVoucher(code);
  }

  protected clearVoucher(): void {
    this.voucherInput = '';
    this.appliedVoucher = '';
    this.voucherError = null;
    this.loadPreview(); // reload without voucher
  }

  private previewWithVoucher(voucherCode: string): void {
    this.previewingVoucher.set(true);
    this.voucherError = null;

    this.paymentService
      .getPaymentPreview(this.orderId, voucherCode)
      .pipe(
        finalize(() => {
          this.previewingVoucher.set(false);
          this.cdr.markForCheck();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.preview = response.data;
          this.appliedVoucher = voucherCode;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.voucherError = err?.error?.message ?? 'Mã voucher không hợp lệ.';
          this.cdr.markForCheck();
        },
      });
  }

  // ── Payment ────────────────────────────────────────────────────────────────

  protected confirm(): void {
    if (!this.preview || this.submitting()) return;

    this.submitting.set(true);

    this.paymentService
      .processPayment(this.orderId, this.selectedMethod(), this.appliedVoucher || null)
      .pipe(
        finalize(() => {
          this.submitting.set(false);
          this.cdr.markForCheck();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          // Trả PaymentData cho caller (OrderDishesHistory) để mở PaymentSuccessDialog
          this.context?.completeWith(response.data);
        },
        error: (err) => {
          console.error('[PosConfirmPayment] Payment failed', err);
          const message = err?.error?.message || 'Thanh toán thất bại. Vui lòng thử lại.';
          this.alert
            .open(message, {
              label: 'Lỗi thanh toán',
              appearance: 'negative',
              autoClose: 5000,
              closeable: true,
            })
            .subscribe();
        },
      });
  }

  protected close(): void {
    this.context?.completeWith(null);
  }

  private loadPreview(): void {
    this.loading.set(true);
    this.error.set(null);

    // Nếu đã có voucher pre-applied từ POS → load preview kèm voucher luôn
    this.paymentService
      .getPaymentPreview(this.orderId, this.appliedVoucher || null)
      .pipe(
        finalize(() => {
          this.loading.set(false);
          this.cdr.markForCheck();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.preview = response.data;
          // Default payment method từ API suggestions
          if (response.data.suggestedPaymentMethods?.length > 0) {
            this.selectedMethod.set(response.data.suggestedPaymentMethods[0] as PaymentMethod);
          }
        },
        error: (err) => {
          console.error('[PosConfirmPayment] Preview failed', err);
          this.error.set(
            err?.error?.message || 'Không thể tải thông tin thanh toán. Vui lòng thử lại.',
          );
        },
      });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  protected get displayFinalAmount(): number {
    if (!this.preview) return 0;
    return this.preview.finalAmount ?? this.preview.totalAmount;
  }

  protected get hasDiscount(): boolean {
    return !!this.preview?.discountAmount && this.preview.discountAmount > 0;
  }
}
