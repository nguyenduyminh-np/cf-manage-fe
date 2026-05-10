import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TuiButton, TuiDialogContext } from '@taiga-ui/core';
import { injectContext } from '@taiga-ui/polymorpheus';
import { VoucherListItem } from '../../../../../core/models/voucher/voucher.model';

export interface VoucherDeactivateDialogInput {
  voucher: VoucherListItem;
}

@Component({
  standalone: true,
  selector: 'app-voucher-deactivate-dialog',
  imports: [TuiButton],
  templateUrl: './voucher-deactivate-dialog.html',
  styleUrl: './voucher-deactivate-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VoucherDeactivateDialog {
  protected readonly context =
    injectContext<TuiDialogContext<boolean, VoucherDeactivateDialogInput>>();

  protected readonly voucher = this.context.data.voucher;

  protected confirm(): void {
    this.context.completeWith(true);
  }

  protected cancel(): void {
    this.context.completeWith(false);
  }
}
