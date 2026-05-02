import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TuiButton, TuiDialogContext } from '@taiga-ui/core';
import { injectContext } from '@taiga-ui/polymorpheus';
import { DishListItem } from '../../../../core/models/dish/dish.model';

export interface DishDeleteDialogInput { dish: DishListItem; }

@Component({
  standalone: true,
  selector: 'app-dish-delete-dialog',
  imports: [TuiButton],
  templateUrl: './dish-delete-dialog.html',
  styleUrl: './dish-delete-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DishDeleteDialog {
  protected readonly context = injectContext<TuiDialogContext<boolean, DishDeleteDialogInput>>();
  protected get dishName(): string { return this.context.data.dish.dishName; }
  protected confirm(): void { this.context.completeWith(true); }
  protected cancel(): void  { this.context.completeWith(false); }
}
