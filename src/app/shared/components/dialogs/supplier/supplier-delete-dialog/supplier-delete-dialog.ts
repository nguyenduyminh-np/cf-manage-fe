import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TuiButton, TuiDialogContext } from '@taiga-ui/core';
import { injectContext } from '@taiga-ui/polymorpheus';
import { SupplierListItem } from '../../../../../core/models/supplier/supplier.model';

export interface SupplierDeleteDialogInput {
  supplier: SupplierListItem;
}

@Component({
  standalone: true,
  selector: 'app-supplier-delete-dialog',
  imports: [TuiButton],
  templateUrl: './supplier-delete-dialog.html',
  styleUrl: './supplier-delete-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupplierDeleteDialog {
  protected readonly context =
    injectContext<TuiDialogContext<boolean, SupplierDeleteDialogInput>>();

  protected readonly supplier = this.context.data.supplier;

  protected confirm(): void {
    this.context.completeWith(true);
  }
  protected cancel(): void {
    this.context.completeWith(false);
  }
}
