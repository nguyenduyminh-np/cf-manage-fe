import { CommonModule, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TuiDialogContext } from '@taiga-ui/core';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { PaymentData } from '../../../../../core/models/payment/payment.model';

/** Input: chính là PaymentData trả về từ API /thanh-toan cộng thêm tableName */
export interface PaymentSuccessDialogInput {
  paymentData: PaymentData;
  tableName: string;
}

@Component({
  standalone: true,
  selector: 'app-payment-success-dialog',
  imports: [CommonModule, DecimalPipe],
  templateUrl: './payment-success-dialog.html',
  styleUrl: './payment-success-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentSuccessDialog {
  private readonly context = inject(POLYMORPHEUS_CONTEXT, {
    optional: true,
  }) as TuiDialogContext<boolean | null, PaymentSuccessDialogInput> | null;

  protected readonly data = this.context?.data;

  // Computed helpers cho template
  protected get invoice() {
    return this.data?.paymentData?.invoice;
  }

  protected get items() {
    return this.data?.paymentData?.invoiceDetails ?? [];
  }

  protected get cashFlow() {
    return this.data?.paymentData?.cashFlow;
  }

  protected printInvoice(): void {
    console.log('Printing invoice for:', this.invoice?.invoiceCode);
    this.context?.completeWith(true);
  }

  protected close(): void {
    this.context?.completeWith(false);
  }
}
