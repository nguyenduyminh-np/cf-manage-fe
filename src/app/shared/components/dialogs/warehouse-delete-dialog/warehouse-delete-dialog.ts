import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TuiButton, TuiDialogContext } from '@taiga-ui/core';
import { injectContext } from '@taiga-ui/polymorpheus';
import { WarehouseListItem } from '../../../../core/models/warehouse/warehouse.model';

export interface WarehouseDeleteDialogInput {
  warehouse: WarehouseListItem;
}

@Component({
  standalone: true,
  selector: 'app-warehouse-delete-dialog',
  imports: [TuiButton],
  templateUrl: './warehouse-delete-dialog.html',
  styleUrl: './warehouse-delete-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WarehouseDeleteDialog {
  protected readonly context = injectContext<
    TuiDialogContext<boolean, WarehouseDeleteDialogInput>
  >();

  protected readonly warehouse = this.context.data.warehouse;

  protected confirm(): void { this.context.completeWith(true); }
  protected cancel(): void  { this.context.completeWith(false); }
}
