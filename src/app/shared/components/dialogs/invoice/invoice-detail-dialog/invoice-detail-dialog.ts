import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TuiDialogContext } from '@taiga-ui/core';
import { injectContext } from '@taiga-ui/polymorpheus';
import { InvoiceDetailData } from '../../../../../core/models/invoice/invoice.model';

export interface InvoiceDetailDialogInput {
  invoiceData: InvoiceDetailData;
}

@Component({
  standalone: true,
  selector: 'app-invoice-detail-dialog',
  imports: [CommonModule, DatePipe, DecimalPipe],
  templateUrl: './invoice-detail-dialog.html',
  styleUrl: './invoice-detail-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvoiceDetailDialog {
  // Sử dụng injectContext thay vì POLYMORPHEUS_CONTEXT trực tiếp
  private readonly context =
    injectContext<TuiDialogContext<boolean | null, InvoiceDetailDialogInput>>();

  protected get data(): InvoiceDetailDialogInput | null {
    return this.context.data ?? null;
  }

  protected printInvoice(): void {
    // Phát tín hiệu là đã in, parent có thể xử lý
    this.context.completeWith(true);
  }

  protected close(): void {
    this.context.completeWith(false);
  }

  protected statusLabel(status?: string): string {
    if (!status) return '';
    return status === 'PAID' ? 'Đã thanh toán' : 'Chờ thanh toán';
  }

  protected paymentMethodLabel(method?: string): string {
    if (!method) return '';
    return method === 'BANK' ? 'Chuyển khoản' : 'Tiền mặt';
  }
}
