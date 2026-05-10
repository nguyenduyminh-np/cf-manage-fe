import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TuiButton, TuiDialogContext } from '@taiga-ui/core';
import { injectContext } from '@taiga-ui/polymorpheus';
import { IngredientListItem } from '../../../../../core/models/ingredient/ingredient.model';

export interface IngredientDeleteDialogInput {
  ingredient: IngredientListItem;
}

@Component({
  standalone: true,
  selector: 'app-ingredient-delete-dialog',
  imports: [TuiButton],
  templateUrl: './ingredient-delete-dialog.html',
  styleUrl: './ingredient-delete-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IngredientDeleteDialog {
  protected readonly context =
    injectContext<TuiDialogContext<boolean, IngredientDeleteDialogInput>>();

  protected readonly ingredient = this.context.data.ingredient;

  protected confirm(): void {
    this.context.completeWith(true);
  }
  protected cancel(): void {
    this.context.completeWith(false);
  }
}
