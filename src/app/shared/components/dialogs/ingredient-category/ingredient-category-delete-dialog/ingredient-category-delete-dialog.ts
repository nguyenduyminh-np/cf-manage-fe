import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TuiButton, TuiDialogContext } from '@taiga-ui/core';
import { injectContext } from '@taiga-ui/polymorpheus';
import { IngredientCategoryListItem } from '../../../../../core/models/ingredient-category/ingredient-category.model';

export interface IngredientCategoryDeleteDialogInput {
  category: IngredientCategoryListItem;
}

@Component({
  standalone: true,
  selector: 'app-ingredient-category-delete-dialog',
  imports: [TuiButton],
  templateUrl: './ingredient-category-delete-dialog.html',
  styleUrl: './ingredient-category-delete-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IngredientCategoryDeleteDialog {
  protected readonly context =
    injectContext<TuiDialogContext<boolean, IngredientCategoryDeleteDialogInput>>();

  protected readonly category = this.context.data.category;

  protected confirm(): void {
    this.context.completeWith(true);
  }
  protected cancel(): void {
    this.context.completeWith(false);
  }
}
