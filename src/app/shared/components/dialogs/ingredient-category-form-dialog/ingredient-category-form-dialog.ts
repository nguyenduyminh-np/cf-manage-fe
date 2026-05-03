import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { TuiButton, TuiDialogContext } from '@taiga-ui/core';
import { injectContext } from '@taiga-ui/polymorpheus';

import {
  IngredientCategoryCreateRequest,
  IngredientCategoryListItem,
  IngredientCategoryOption,
  IngredientCategoryUpdateRequest,
} from '../../../../core/models/ingredient-category/ingredient-category.model';

export interface IngredientCategoryFormDialogInput {
  mode: 'create' | 'edit';
  category: IngredientCategoryListItem | null;
}

interface ApiListResponse<T> { status: number; message: string; data: T[]; }

const BASE = 'http://localhost:8080/api/v1';

@Component({
  standalone: true,
  selector: 'app-ingredient-category-form-dialog',
  imports: [FormsModule, TuiButton],
  templateUrl: './ingredient-category-form-dialog.html',
  styleUrl: './ingredient-category-form-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IngredientCategoryFormDialog implements OnInit {
  private readonly http = inject(HttpClient);

  protected readonly context = injectContext<
    TuiDialogContext<
      IngredientCategoryCreateRequest | IngredientCategoryUpdateRequest | null,
      IngredientCategoryFormDialogInput
    >
  >();

  protected readonly isEdit = this.context.data.mode === 'edit';
  private readonly src = this.context.data.category;

  // ── Options ─────────────────────────────────────────────────────────────
  protected readonly parentCategories = signal<IngredientCategoryOption[]>([]);
  protected readonly loading = signal(true);

  // ── Form data ─────────────────────────────────────────────────────────────
  protected formData = {
    id: this.src?.id ?? 0,
    ingredientCategoryCode: this.src?.ingredientCategoryCode ?? '',
    ingredientCategoryName: this.src?.ingredientCategoryName ?? '',
    parentCategoryId: this.src?.parentCategoryId ?? 0,
    active: this.src?.active ?? true,
  };

  ngOnInit(): void {
    this.http.get<ApiListResponse<IngredientCategoryOption>>(`${BASE}/ingredient-category/options`)
      .toPromise()
      .then(r => {
        const options = r?.data ?? [];
        // Filter out itself if editing
        const filtered = this.isEdit
          ? options.filter(o => o.id !== this.src?.id)
          : options;
        this.parentCategories.set(filtered);
        this.loading.set(false);
      })
      .catch(() => this.loading.set(false));
  }

  // ── Validation ─────────────────────────────────────────────────────────────
  protected get isValid(): boolean {
    return !!this.formData.ingredientCategoryName.trim();
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  protected submit(): void {
    if (!this.isValid) return;

    if (this.isEdit) {
      const payload: IngredientCategoryUpdateRequest = {
        id: this.formData.id,
        ingredientCategoryCode: this.formData.ingredientCategoryCode.trim() || undefined,
        ingredientCategoryName: this.formData.ingredientCategoryName.trim(),
        parentCategoryId: this.formData.parentCategoryId > 0 ? this.formData.parentCategoryId : undefined,
        active: this.formData.active,
      };
      this.context.completeWith(payload);
    } else {
      const payload: IngredientCategoryCreateRequest = {
        ingredientCategoryCode: this.formData.ingredientCategoryCode.trim() || undefined,
        ingredientCategoryName: this.formData.ingredientCategoryName.trim(),
        parentCategoryId: this.formData.parentCategoryId > 0 ? this.formData.parentCategoryId : undefined,
      };
      this.context.completeWith(payload);
    }
  }

  protected cancel(): void {
    this.context.completeWith(null);
  }
}
