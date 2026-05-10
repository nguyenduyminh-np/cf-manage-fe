import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TuiButton, TuiDialogContext } from '@taiga-ui/core';
import { injectContext } from '@taiga-ui/polymorpheus';
import {
  DishCategoryListItem,
  DishCategoryCreateRequest,
  DishCategoryUpdateRequest,
} from '../../../../../core/models/dish-category/dish-category.model';

export interface DishCategoryFormDialogInput {
  mode: 'create' | 'edit' | 'view';
  category: DishCategoryListItem | null;
}

@Component({
  standalone: true,
  selector: 'app-dish-category-form-dialog',
  imports: [FormsModule, TuiButton],
  templateUrl: './dish-category-form-dialog.html',
  styleUrl: './dish-category-form-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DishCategoryFormDialog {
  protected readonly context =
    injectContext<
      TuiDialogContext<
        DishCategoryCreateRequest | DishCategoryUpdateRequest | null,
        DishCategoryFormDialogInput
      >
    >();

  protected readonly isEdit = this.context.data.mode === 'edit';
  protected readonly isView = this.context.data.mode === 'view';

  protected formData = {
    dishCategoryCode: this.context.data.category?.dishCategoryCode ?? '',
    dishCategoryName: this.context.data.category?.dishCategoryName ?? '',
    active: this.context.data.category?.active ?? true,
  };

  protected submit(): void {
    if (this.isView || !this.formData.dishCategoryName.trim()) return;

    if (this.isEdit && this.context.data.category) {
      const payload: DishCategoryUpdateRequest = {
        id: this.context.data.category.id,
        dishCategoryCode: this.formData.dishCategoryCode.trim() || undefined,
        dishCategoryName: this.formData.dishCategoryName.trim(),
        active: this.formData.active,
      };
      this.context.completeWith(payload);
    } else {
      const payload: DishCategoryCreateRequest = {
        dishCategoryCode: this.formData.dishCategoryCode.trim() || undefined,
        dishCategoryName: this.formData.dishCategoryName.trim(),
      };
      this.context.completeWith(payload);
    }
  }

  protected cancel(): void {
    this.context.completeWith(null);
  }
}
