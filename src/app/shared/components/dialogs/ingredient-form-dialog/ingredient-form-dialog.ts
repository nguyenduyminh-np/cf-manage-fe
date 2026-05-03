import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { TuiButton, TuiDialogContext } from '@taiga-ui/core';
import { injectContext } from '@taiga-ui/polymorpheus';

import {
  IngredientCreateRequest,
  IngredientListItem,
  IngredientUpdateRequest,
} from '../../../../core/models/ingredient/ingredient.model';

// ── Option interfaces ─────────────────────────────────────────────────────────
interface CategoryOption { id: number; ingredientCategoryName: string; }
interface SupplierOption  { id: number; supplierName: string; }
interface UnitOption      { id: number; unitName: string; }

interface ApiListResponse<T> { status: number; message: string; data: T[]; }

export interface IngredientFormDialogInput {
  mode: 'create' | 'edit';
  ingredient: IngredientListItem | null;
}

const BASE = 'http://localhost:8080/api/v1';

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
  private readonly src = this.context.data.ingredient;

  // ── Option lists ──────────────────────────────────────────────────────────
  protected readonly categories = signal<CategoryOption[]>([]);
  protected readonly suppliers  = signal<SupplierOption[]>([]);
  protected readonly units      = signal<UnitOption[]>([]);
  protected readonly loading    = signal(true);

  // ── Form data ─────────────────────────────────────────────────────────────
  protected formData = {
    id:                    this.src?.id ?? 0,
    ingredientCode:        this.src?.ingredientCode ?? '',
    ingredientName:        this.src?.ingredientName ?? '',
    selfLife:              this.src?.selfLife ?? 1,
    averagePrice:          this.src?.averagePrice ?? 0,
    ingredientCategoryId:  this.src?.ingredientCategoryId ?? 0,
    supplierId:            this.src?.supplierId ?? 0,
    unitId:                this.src?.unitId ?? 0,
    active:                this.src?.active ?? true,
  };

  ngOnInit(): void {
    Promise.all([
      this.fetchList<CategoryOption>(`${BASE}/ingredient-category/options`),
      this.fetchList<SupplierOption>(`${BASE}/supplier/options`),
      this.fetchList<UnitOption>(`${BASE}/unit/options`),
    ]).then(([cats, sups, units]) => {
      this.categories.set(cats);
      this.suppliers.set(sups);
      this.units.set(units);
      this.loading.set(false);
    }).catch(() => this.loading.set(false));
  }

  private fetchList<T>(url: string): Promise<T[]> {
    return this.http.get<ApiListResponse<T>>(url).toPromise()
      .then(r => r?.data ?? []).catch(() => []);
  }

  // ── Validation ─────────────────────────────────────────────────────────────
  protected get isValid(): boolean {
    return (
      !!this.formData.ingredientName.trim() &&
      this.formData.selfLife >= 1 &&
      this.formData.averagePrice >= 0 &&
      this.formData.ingredientCategoryId > 0 &&
      this.formData.supplierId > 0 &&
      this.formData.unitId > 0
    );
  }

  // ── Format ─────────────────────────────────────────────────────────────────
  protected fmtCurrency(v: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  protected submit(): void {
    if (!this.isValid) return;
    if (this.isEdit) {
      const payload: IngredientUpdateRequest = {
        id:                   this.formData.id,
        ingredientCode:       this.formData.ingredientCode.trim() || undefined,
        ingredientName:       this.formData.ingredientName.trim(),
        selfLife:             this.formData.selfLife,
        averagePrice:         this.formData.averagePrice,
        ingredientCategoryId: this.formData.ingredientCategoryId,
        supplierId:           this.formData.supplierId,
        unitId:               this.formData.unitId,
        active:               this.formData.active,
      };
      this.context.completeWith(payload);
    } else {
      const payload: IngredientCreateRequest = {
        ingredientCode:       this.formData.ingredientCode.trim() || undefined,
        ingredientName:       this.formData.ingredientName.trim(),
        selfLife:             this.formData.selfLife,
        averagePrice:         this.formData.averagePrice,
        ingredientCategoryId: this.formData.ingredientCategoryId,
        supplierId:           this.formData.supplierId,
        unitId:               this.formData.unitId,
      };
      this.context.completeWith(payload);
    }
  }

  protected cancel(): void { this.context.completeWith(null); }
}
