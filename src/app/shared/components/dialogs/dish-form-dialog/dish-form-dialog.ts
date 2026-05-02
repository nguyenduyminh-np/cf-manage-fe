import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TuiButton, TuiDialogContext } from '@taiga-ui/core';
import { injectContext } from '@taiga-ui/polymorpheus';
import { environment } from '../../../../../environments/environment';
import {
  DishCreateRequest,
  DishListItem,
  DishUpdateRequest,
} from '../../../../core/models/dish/dish.model';
import { DishCategoryOption } from '../../../../core/models/dish-category/dish-category.model';
import { DishCategoryService } from '../../../../core/services/dish-category/dish-category.service';
import { UiComponentModule } from '../../ui-component/ui-component.module';
import { UiSelectOption } from '../../ui-component/ui-select/ui-select';

export interface DishFormDialogInput {
  mode: 'create' | 'edit';
  dish: DishListItem | null;
}

@Component({
  standalone: true,
  selector: 'app-dish-form-dialog',
  imports: [FormsModule, TuiButton, UiComponentModule],
  templateUrl: './dish-form-dialog.html',
  styleUrl: './dish-form-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DishFormDialog implements OnInit {
  private readonly catService = inject(DishCategoryService);
  protected readonly context =
    injectContext<
      TuiDialogContext<DishCreateRequest | DishUpdateRequest | null, DishFormDialogInput>
    >();

  protected readonly isEdit = this.context.data.mode === 'edit';
  protected readonly categories = signal<DishCategoryOption[]>([]);
  protected readonly catLoading = signal(true);

  // ── Xây dựng base URL để hiển thị ảnh tương đối ───────────────────────
  private readonly imgBaseUrl = `${new URL(environment.apiUrl).origin}/`;

  private resolvePhotoUrl(photo: string): string {
    if (!photo) return '';
    if (photo.startsWith('http') || photo.startsWith('blob:') || photo.startsWith('//'))
      return photo;
    return this.imgBaseUrl + photo;
  }

  // ── Form data — lưu id riêng để đảm bảo không bị mất khi submit ───────
  protected formData = {
    id: this.context.data.dish?.id ?? 0, // BUG FIX: lưu id ở đây
    dishCode: this.context.data.dish?.dishCode ?? '',
    dishName: this.context.data.dish?.dishName ?? '',
    price: this.context.data.dish?.price ?? 0,
    // photo lưu đường dẫn tương đối (gửi server); preview hiển thị full URL
    photo: this.context.data.dish?.photo ?? '',
    dishCategoryId: this.context.data.dish?.dishCategoryId ?? 0,
    active: this.context.data.dish?.active ?? true,
  };

  // photoPreview khởi tạo với full URL để hiển thị đúng
  protected photoPreview = signal<string>(
    this.resolvePhotoUrl(this.context.data.dish?.photo ?? ''),
  );

  private selectedFile: File | null = null;

  ngOnInit(): void {
    this.catService.getOptions().subscribe({
      next: (r) => {
        this.categories.set(r.data);
        this.catLoading.set(false);
      },
      error: () => {
        this.catLoading.set(false);
      },
    });
  }

  protected get selectedCategoryLabel(): string {
    return 'Chọn danh mục';
  }

  protected get categoryOptions(): ReadonlyArray<UiSelectOption<number>> {
    return this.categories().map((category) => ({
      label: category.dishCategoryName,
      value: category.id,
    }));
  }

  protected onCategoryChange(value: string | number | null): void {
    this.formData.dishCategoryId = typeof value === 'number' ? value : 0;
  }

  // ── Chọn file ────────────────────────────────────────────────────────────
  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.selectedFile = file;

    // Revoke blob cũ nếu có
    const prev = this.photoPreview();
    if (prev.startsWith('blob:')) URL.revokeObjectURL(prev);

    const objectUrl = URL.createObjectURL(file);
    this.photoPreview.set(objectUrl);
    this.formData.photo = file.name; // BE xử lý upload; tạm thời lưu tên file
  }

  // ── Xoá ảnh ──────────────────────────────────────────────────────────────
  protected clearPhoto(): void {
    const prev = this.photoPreview();
    if (prev.startsWith('blob:')) URL.revokeObjectURL(prev);
    this.photoPreview.set('');
    this.formData.photo = '';
    this.selectedFile = null;
  }

  // ── Người dùng gõ URL thủ công ───────────────────────────────────────────
  protected onPhotoUrlChange(): void {
    const prev = this.photoPreview();
    if (prev.startsWith('blob:')) URL.revokeObjectURL(prev);
    this.selectedFile = null;
    // Hiển thị preview với full URL, nhưng formData.photo vẫn là relative
    this.photoPreview.set(this.resolvePhotoUrl(this.formData.photo));
  }

  // ── Validation ────────────────────────────────────────────────────────────
  protected get isValid(): boolean {
    return (
      !!this.formData.dishName.trim() && this.formData.price > 0 && this.formData.dishCategoryId > 0
    );
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  protected submit(): void {
    if (!this.isValid) return;

    const prev = this.photoPreview();
    if (prev.startsWith('blob:')) URL.revokeObjectURL(prev);

    if (this.isEdit) {
      // BUG FIX: Luôn lấy id từ formData.id (đã được khởi tạo từ dish.id)
      const payload: DishUpdateRequest = {
        id: this.formData.id,
        dishCode: this.formData.dishCode.trim() || undefined,
        dishName: this.formData.dishName.trim(),
        price: this.formData.price,
        photo: this.formData.photo.trim() || undefined,
        dishCategoryId: this.formData.dishCategoryId,
        active: this.formData.active,
      };
      this.context.completeWith(payload);
    } else {
      const payload: DishCreateRequest = {
        dishCode: this.formData.dishCode.trim() || undefined,
        dishName: this.formData.dishName.trim(),
        price: this.formData.price,
        photo: this.formData.photo.trim() || '',
        dishCategoryId: this.formData.dishCategoryId,
      };
      this.context.completeWith(payload);
    }
  }

  protected cancel(): void {
    const prev = this.photoPreview();
    if (prev.startsWith('blob:')) URL.revokeObjectURL(prev);
    this.context.completeWith(null);
  }
}
