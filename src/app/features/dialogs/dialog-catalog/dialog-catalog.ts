import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, Injector, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TuiButton, TuiDialogService } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';

import { OrderDishesDialog } from '../../../shared/components/dialogs/order-dishes-dialog/order-dishes-dialog';
import { PosOrderDishes } from '../../../shared/components/dialogs/pos-order-dishes/pos-order-dishes';
import { TableBookingDetail } from '../../../shared/components/dialogs/table-booking-detail/table-booking-detail';
import { TableBookingHistory } from '../../../shared/components/dialogs/table-booking-history/table-booking-history';
import { TableDetailDialog } from '../../../shared/components/dialogs/table-detail-dialog/table-detail-dialog';

type DialogKey =
  | 'table-detail-dialog'
  | 'table-booking-history'
  | 'table-booking-detail'
  | 'order-dishes-dialog'
  | 'pos-order-dishes';

interface DialogCatalogItem {
  key: DialogKey;
  name: string;
  summary: string;
  route: string;
  supportsPreview: boolean;
}

@Component({
  standalone: true,
  selector: 'app-dialog-catalog',
  imports: [NgClass, RouterLink, TuiButton],
  templateUrl: './dialog-catalog.html',
  styleUrl: './dialog-catalog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogCatalog {
  private readonly route = inject(ActivatedRoute);
  private readonly injector = inject(Injector);
  private readonly dialogService = inject(TuiDialogService);

  private readonly dialogKeyParam = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });

  protected readonly dialogItems: DialogCatalogItem[] = [
    {
      key: 'table-detail-dialog',
      name: 'Table Detail Dialog',
      summary: 'Hiển thị chi tiết một bàn theo tableId.',
      route: '/dialogs/table-detail-dialog',
      supportsPreview: true,
    },
    {
      key: 'table-booking-history',
      name: 'Table Booking History',
      summary: 'Hiển thị lịch sử đặt bàn bằng ag-grid và phân trang.',
      route: '/dialogs/table-booking-history',
      supportsPreview: true,
    },
    {
      key: 'table-booking-detail',
      name: 'Table Booking Detail',
      summary: 'Hiển thị chi tiết một đơn đặt bàn theo bookingId.',
      route: '/dialogs/table-booking-detail',
      supportsPreview: true,
    },
    {
      key: 'order-dishes-dialog',
      name: 'Order Dishes Dialog',
      summary: 'Dialog đặt món hiện tại mới có skeleton cơ bản.',
      route: '/dialogs/order-dishes-dialog',
      supportsPreview: false,
    },
    {
      key: 'pos-order-dishes',
      name: 'POS Order Dishes',
      summary: 'Dialog đặt món POS hiện tại mới có skeleton cơ bản.',
      route: '/dialogs/pos-order-dishes',
      supportsPreview: false,
    },
  ];

  protected readonly activeDialog = computed<DialogCatalogItem>(() => {
    const routeKey = this.dialogKeyParam().get('dialogKey');
    const found = this.dialogItems.find((item) => item.key === routeKey);
    return found ?? this.dialogItems[0];
  });

  protected previewDialog(): void {
    const active = this.activeDialog();

    if (!active.supportsPreview) {
      return;
    }

    switch (active.key) {
      case 'table-detail-dialog':
        this.dialogService
          .open(new PolymorpheusComponent(TableDetailDialog, this.injector), {
            data: 1,
            size: 'auto',
            dismissible: true,
            closeable: true,
            label: 'Table Detail Dialog',
          })
          .subscribe();
        return;
      case 'table-booking-history':
        this.dialogService
          .open(new PolymorpheusComponent(TableBookingHistory, this.injector), {
            data: 1,
            size: 'auto',
            dismissible: true,
            closeable: false,
          })
          .subscribe();
        return;
      case 'table-booking-detail':
        this.dialogService
          .open(new PolymorpheusComponent(TableBookingDetail, this.injector), {
            data: 159,
            size: 'auto',
            dismissible: true,
            closeable: true,
            label: 'Table Booking Detail',
          })
          .subscribe();
        return;
      case 'order-dishes-dialog':
        this.dialogService
          .open(new PolymorpheusComponent(OrderDishesDialog, this.injector), {
            size: 'auto',
            dismissible: true,
            closeable: true,
            label: 'Order Dishes Dialog',
          })
          .subscribe();
        return;
      case 'pos-order-dishes':
        this.dialogService
          .open(new PolymorpheusComponent(PosOrderDishes, this.injector), {
            size: 'auto',
            dismissible: true,
            closeable: true,
            label: 'POS Order Dishes',
          })
          .subscribe();
        return;
      default:
        return;
    }
  }
}
