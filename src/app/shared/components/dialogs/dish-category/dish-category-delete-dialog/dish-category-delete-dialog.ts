import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TuiButton, TuiDialogContext } from '@taiga-ui/core';
import { injectContext } from '@taiga-ui/polymorpheus';
import { DishCategoryListItem } from '../../../../../core/models/dish-category/dish-category.model';

export interface DishCategoryDeleteDialogInput {
  category: DishCategoryListItem;
}

@Component({
  standalone: true,
  selector: 'app-dish-category-delete-dialog',
  imports: [TuiButton],
  templateUrl: './dish-category-delete-dialog.html',
  styleUrl: './dish-category-delete-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DishCategoryDeleteDialog {
  protected readonly context =
    injectContext<TuiDialogContext<boolean, DishCategoryDeleteDialogInput>>();

  protected get categoryName(): string {
    return this.context.data.category.dishCategoryName;
  }

  protected confirm(): void {
    this.context.completeWith(true);
  }

  protected cancel(): void {
    this.context.completeWith(false);
  }
}
