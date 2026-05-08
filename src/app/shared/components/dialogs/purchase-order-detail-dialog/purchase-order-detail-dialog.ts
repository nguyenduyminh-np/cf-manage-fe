import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { LowerCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TuiButton, TuiDialogContext } from '@taiga-ui/core';
import { injectContext } from '@taiga-ui/polymorpheus';

import {
  PurchaseOrderDetail,
  PurchaseOrderStatusUpdateRequest,
} from '../../../../core/models/purchase-order/purchase-order.model';
import { PurchaseOrderService } from '../../../../core/services/purchase-order/purchase-order.model';

export interface PurchaseOrderDetailDialogInput {
  order: PurchaseOrderDetail;
}

export interface PurchaseOrderDetailDialogOutput {
  action: 'status' | 'refresh' | null;
  newStatus?: string;
  warehouseId?: number;
}

// Status flow: allowed transitions
const ALLOWED: Record<string, string[]> = {
  DRAFT: ['PENDING', 'APPROVED'],
  PENDING: ['APPROVED', 'CANCELLED'],
  APPROVED: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Nháp',
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};

const STATUS_ACTIONS: Record<string, { label: string; icon: string; cls: string }> = {
  PENDING:   { label: 'Gửi duyệt',   icon: 'send',          cls: 'action--pending'   },
  APPROVED:  { label: 'Duyệt đơn',   icon: 'thumb_up',      cls: 'action--approve'   },
  COMPLETED: { label: 'Hoàn thành',  icon: 'check_circle',  cls: 'action--complete'  },
  CANCELLED: { label: 'Hủy đơn',     icon: 'cancel',        cls: 'action--cancel'    },
};

@Component({
  standalone: true,
  selector: 'app-purchase-order-detail-dialog',
  imports: [FormsModule, TuiButton, LowerCasePipe],
  templateUrl: './purchase-order-detail-dialog.html',
  styleUrl: './purchase-order-detail-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PurchaseOrderDetailDialog {
  private readonly poService = inject(PurchaseOrderService);
  protected readonly context = injectContext<
    TuiDialogContext<PurchaseOrderDetailDialogOutput | null, PurchaseOrderDetailDialogInput>
  >();

  protected readonly order = this.context.data.order;
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);

  // For COMPLETED transition: may need warehouseId
  protected warehouseIdForComplete: number = this.order.warehouseId ?? 0;

  protected get allowedTransitions(): string[] {
    return ALLOWED[this.order.paymentStatus] ?? [];
  }

  protected statusLabel(s: string): string {
    return STATUS_LABEL[s] ?? s;
  }

  protected statusIcon(s: string): string {
    const icons: Record<string, string> = {
      DRAFT: 'pending_actions',
      PENDING: 'schedule',
      APPROVED: 'verified',
      COMPLETED: 'check_circle',
      CANCELLED: 'cancel',
    };
    return icons[s] ?? 'info';
  }

  protected actionMeta(s: string): { label: string; icon: string; cls: string } {
    return STATUS_ACTIONS[s] ?? { label: s, icon: 'arrow_forward', cls: '' };
  }

  protected isTerminal(): boolean {
    return this.order.paymentStatus === 'COMPLETED' || this.order.paymentStatus === 'CANCELLED';
  }

  protected changeStatus(newStatus: string): void {
    if (this.submitting()) return;
    this.submitting.set(true);
    this.error.set(null);

    const req: PurchaseOrderStatusUpdateRequest = {
      id: this.order.id,
      newStatus,
      warehouseId: newStatus === 'COMPLETED' ? (this.warehouseIdForComplete || undefined) : undefined,
    };

    this.poService.updateStatus(req).subscribe({
      next: () => {
        this.submitting.set(false);
        this.context.completeWith({ action: 'status', newStatus });
      },
      error: (e) => {
        this.submitting.set(false);
        this.error.set(e?.error?.message ?? 'Không thể cập nhật trạng thái. Vui lòng thử lại.');
      },
    });
  }

  protected close(): void {
    this.context.completeWith(null);
  }

  // ── Formatters ─────────────────────────────────────────────────────────────
  protected fmtCurrency(v: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);
  }

  protected fmtDT(iso: string | null): string {
    if (!iso) return '—';
    return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(new Date(iso));
  }
}
