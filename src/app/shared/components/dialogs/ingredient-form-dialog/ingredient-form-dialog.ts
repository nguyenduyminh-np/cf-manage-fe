import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { TuiButton, TuiDialogContext } from '@taiga-ui/core';
import { injectContext } from '@taiga-ui/polymorpheus';
import { firstValueFrom } from 'rxjs';

import {
  IngredientCreateRequest,
  IngredientUpdateRequest,
  IngredientDetail,
  ApiResponse,
} from '../../../../core/models/ingredient/ingredient.model';

// ── Dropdown option interfaces (from new APIs) ────────────────────────────────
interface CategorySelectOption {
  ingredientCategoryCode: string;
  ingredientCategoryName: string;
}
interface SupplierSelectOption {
  supplierCode: string;
  supplierName: string;
}
interface UnitSelectOption {
  unitCode: string;
  unitName: string;
}

interface ApiListResponse<T> { status: number; message: string; data: T[]; }

export interface IngredientFormDialogInput {
  mode: 'create' | 'edit' | 'view';
  ingredient: { id: number } | null; // chỉ cần id để gọi /detail
}

@Component({
  standalone: true,
  selector: 'app-ingredient-form-dialog',
  imports: [FormsModule, TuiButton],
  templateUrl: './ingredient-form-dialog.html',
  styleUrl:    './ingredient-form-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IngredientFormDialog implements OnInit {
  private readonly http = inject(HttpClient);

  protected readonly context = injectContext<
    TuiDialogContext<IngredientCreateRequest | IngredientUpdateRequest | null, IngredientFormDialogInput>
  >();

  protected readonly isEdit = this.context.data.mode === 'edit';
  protected readonly isView = this.context.data.mode === 'view';
  private readonly srcId = this.context.data.ingredient?.id ?? null;

  // ── Dropdown option lists ────────────────────────────────────────────────
  protected readonly categories = signal<CategorySelectOption[]>([]);
  protected readonly suppliers  = signal<SupplierSelectOption[]>([]);
  protected readonly units      = signal<UnitSelectOption[]>([]);
  protected readonly loading    = signal(true);

  // ── Form data — sử dụng *Code thay vì *Id ─────────────────────────────
  protected formData = {
    id:                    0,
    ingredientCode:        '',
    ingredientName:        '',
    selfLife:              1,
    averagePrice:          0,
    ingredientCategoryCode: '',
    supplierCode:           '',
    unitCode:               '',
    active:                true,
  };

  ngOnInit(): void {
    // Gọi 3 API dropdown song song (+ detail nếu edit)
    const dropdownPromises = [
      this.fetchList<CategorySelectOption>('/ingredient/danh-sach-danh-muc'),
      this.fetchList<SupplierSelectOption>('/ingredient/danh-sach-nha-cung-cap'),
      this.fetchList<UnitSelectOption>('/ingredient/danh-sach-don-vi'),
    ] as const;

    if ((this.isEdit || this.isView) && this.srcId) {
      // Edit mode: gọi song song 4 API (3 dropdown + 1 detail)
      Promise.all([
        ...dropdownPromises,
        this.fetchDetail(this.srcId),
      ]).then(([cats, sups, units, detail]) => {
        this.categories.set(cats);
        this.suppliers.set(sups);
        this.units.set(units);

        if (detail) {
          this.formData = {
            id:                     detail.id,
            ingredientCode:         detail.ingredientCode ?? '',
            ingredientName:         detail.ingredientName,
            selfLife:               detail.selfLife,
            averagePrice:           detail.averagePrice,
            ingredientCategoryCode: detail.ingredientCategoryCode ?? '',
            supplierCode:           detail.supplierCode ?? '',
            unitCode:               detail.unitCode ?? '',
            active:                 detail.active,
          };
        }
        this.loading.set(false);
      }).catch(() => this.loading.set(false));
    } else {
      // Create mode: chỉ gọi 3 API dropdown
      Promise.all(dropdownPromises).then(([cats, sups, units]) => {
        this.categories.set(cats);
        this.suppliers.set(sups);
        this.units.set(units);
        this.loading.set(false);
      }).catch(() => this.loading.set(false));
    }
  }

  private async fetchList<T>(url: string): Promise<T[]> {
    try {
      const r = await firstValueFrom(this.http.post<ApiListResponse<T>>(url, {}));
      return r?.data ?? [];
    } catch { return []; }
  }

  private async fetchDetail(id: number): Promise<IngredientDetail | null> {
    try {
      const r = await firstValueFrom(
        this.http.post<ApiResponse<IngredientDetail>>('/ingredient/detail', { id }),
      );
      return r?.data ?? null;
    } catch { return null; }
  }

  // ── Validation ─────────────────────────────────────────────────────────────
  protected get isValid(): boolean {
    return (
      !!this.formData.ingredientName.trim() &&
      this.formData.selfLife >= 1 &&
      this.formData.averagePrice >= 0 &&
      !!this.formData.ingredientCategoryCode &&
      !!this.formData.supplierCode &&
      !!this.formData.unitCode
    );
  }

  // ── Format ─────────────────────────────────────────────────────────────────
  protected fmtCurrency(v: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);
  }

  // ── Submit — payload sử dụng *Code ─────────────────────────────────────────
  protected submit(): void {
    if (this.isView || !this.isValid) return;
    if (this.isEdit) {
      const payload: IngredientUpdateRequest = {
        id:                    this.formData.id,
        ingredientCode:        this.formData.ingredientCode.trim() || undefined,
        ingredientName:        this.formData.ingredientName.trim(),
        selfLife:              this.formData.selfLife,
        averagePrice:          this.formData.averagePrice,
        ingredientCategoryCode: this.formData.ingredientCategoryCode,
        supplierCode:           this.formData.supplierCode,
        unitCode:               this.formData.unitCode,
        active:                this.formData.active,
      };
      this.context.completeWith(payload);
    } else {
      const payload: IngredientCreateRequest = {
        ingredientCode:        this.formData.ingredientCode.trim() || undefined,
        ingredientName:        this.formData.ingredientName.trim(),
        selfLife:              this.formData.selfLife,
        averagePrice:          this.formData.averagePrice,
        ingredientCategoryCode: this.formData.ingredientCategoryCode,
        supplierCode:           this.formData.supplierCode,
        unitCode:               this.formData.unitCode,
      };
      this.context.completeWith(payload);
    }
  }

  protected cancel(): void { this.context.completeWith(null); }
}
