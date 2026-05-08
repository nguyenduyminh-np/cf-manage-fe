import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TuiButton, TuiDialogContext } from '@taiga-ui/core';
import { injectContext } from '@taiga-ui/polymorpheus';
import { PurchaseOrderListItem } from '../../../../core/models/purchase-order/purchase-order.model';

export interface PurchaseOrderDeleteDialogInput {
  order: PurchaseOrderListItem;
}

@Component({
  standalone: true,
  selector: 'app-purchase-order-delete-dialog',
  imports: [TuiButton],
  templateUrl: './purchase-order-delete-dialog.html',
  styleUrl: './purchase-order-delete-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PurchaseOrderDeleteDialog {
  protected readonly context = injectContext<
    TuiDialogContext<boolean, PurchaseOrderDeleteDialogInput>
  >();

  protected readonly order = this.context.data.order;

  protected confirm(): void { this.context.completeWith(true); }
  protected cancel(): void  { this.context.completeWith(false); }
}
