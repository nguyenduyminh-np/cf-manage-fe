import { CommonModule } from '@angular/common';
import { Component, inject, Injector } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { TuiAlertService, TuiDialogService } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { TableBookingHistoryService } from '../../../core/services/table-booking-history/table-booking-history.service';
import { TableBookingDetail } from '../dialogs/table-booking/table-booking-detail/table-booking-detail';
import { ConfirmDeleteDialog } from '../dialogs/confirm/confirm-delete-dialog/confirm-delete-dialog';
import {
  DeleteTableBookingRequest,
  DeleteTableBookingResponse,
} from '../../../core/models/table-booking/table-booking.model';

// Mở rộng kiểu params để nhận callback onDeleted từ parent
export interface ActionParams extends ICellRendererParams {
  data: any; // sẽ được cast thành BookingGridRow
  onDeleted?: () => void;
}

@Component({
  standalone: true,
  selector: 'app-action-cell-render',
  imports: [CommonModule],
  templateUrl: './action-cell-render.html',
  styleUrl: './action-cell-render.scss',
})
export class ActionCellRender implements ICellRendererAngularComp {
  private readonly injector = inject(Injector);
  private readonly dialogs = inject(TuiDialogService);
  private readonly alert = inject(TuiAlertService);
  private readonly bookingHistoryService = inject(TableBookingHistoryService);

  private params!: ActionParams;
  private bookingId!: number;
  private bookingName!: string; // Dùng cho thông báo xóa

  agInit(params: ActionParams): void {
    this.params = params;
    const data = params.data;
    this.bookingId = data?.bookingId;
    // Lấy tên hiển thị cho confirm dialog (có thể dùng customerName hoặc bookingId)
    this.bookingName = data?.customerName || `#${this.bookingId}`;
  }

  refresh(params: ActionParams): boolean {
    this.agInit(params);
    return true;
  }

  protected showDetailDialog(): void {
    if (!this.bookingId) {
      this.showAlert('Không tìm thấy mã đặt bàn.', 'Lỗi', 'negative');
      return;
    }

    this.dialogs
      .open(new PolymorpheusComponent(TableBookingDetail, this.injector), {
        data: { bookingId: this.bookingId },
        size: 'auto',
        dismissible: true,
        closeable: true,
        label: 'Chi tiết đặt bàn',
      })
      .subscribe();
  }

  protected onDelete(): void {
    if (!this.bookingId) {
      this.showAlert('Không tìm thấy mã đặt bàn để xóa.', 'Lỗi', 'negative');
      return;
    }

    // Mở dialog xác nhận
    this.dialogs
      .open<boolean>(new PolymorpheusComponent(ConfirmDeleteDialog, this.injector), {
        data: { name: this.bookingName },
        label: 'Xác nhận xóa',
        size: 'm',
        dismissible: true,
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;

        const request: DeleteTableBookingRequest = { bookingId: this.bookingId };
        this.bookingHistoryService.delete(request).subscribe({
          next: (res: DeleteTableBookingResponse) => {
            if (res?.status === 200) {
              this.showAlert(res.message || 'Xóa thành công', 'Thành công', 'positive');
              // Gọi callback để parent refresh grid
              this.params.onDeleted?.();
            } else {
              this.showAlert('Xóa thất bại', 'Lỗi', 'negative');
            }
          },
          error: () => {
            this.showAlert('Đã xảy ra lỗi khi xóa', 'Lỗi', 'negative');
          },
        });
      });
  }

  private showAlert(
    message: string,
    label: string,
    appearance: 'positive' | 'negative' | 'warning',
  ): void {
    this.alert.open(message, { label, appearance, autoClose: 3000, closeable: true }).subscribe();
  }
}
