import { AsyncPipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TuiDialogContext, TuiDialogService } from '@taiga-ui/core';
import { POLYMORPHEUS_CONTEXT, PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import {
  BehaviorSubject,
  Observable,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  finalize,
  map,
  shareReplay,
  startWith,
  switchMap,
} from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { environment } from '../../../../../environments/environment';
import {
  DishItem,
  DishOrderCreateRequest,
  DishSearchRequest,
  DishSearchResponse,
} from '../../../../core/models/pos-order-dishes/pos-order-dishes.model';
import { PosOrderDishesService } from '../../../../core/services/POS/pos-order-dishes/pos-order-dishes.service';
import {
  OrderDishesSuccessDialog,
  OrderDishesSuccessDialogInput,
} from '../order-dishes-success-dialog/order-dishes-success-dialog';

export interface PosOrderDishesDialogInput {
  tableId: number;
  tableName: string;
  pax: number;
}

interface CategoryTab {
  id: number | null;
  name: string;
}

export interface CartItem {
  dish: DishItem;
  quantity: number;
  note?: string;
}

export interface PosOrderDishesDialogResult {
  items: CartItem[];
  subtotal: number;
  discountAmount: number;
  total: number;
}

@Component({
  standalone: true,
  selector: 'app-pos-order-dishes',
  imports: [ReactiveFormsModule, FormsModule, DecimalPipe, AsyncPipe],
  templateUrl: './pos-order-dishes.html',
  styleUrl: './pos-order-dishes.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PosOrderDishes implements OnInit {
  private static readonly MAX_CACHE_SIZE = 50;
  private static readonly MAX_QTY = 99;

  private readonly dialogContext = inject(POLYMORPHEUS_CONTEXT, {
    optional: true,
  }) as TuiDialogContext<PosOrderDishesDialogResult | null, PosOrderDishesDialogInput> | null;
  private readonly dishService = inject(PosOrderDishesService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly tableName = this.dialogContext?.data?.tableName || 'Ban 3';
  protected readonly pax = this.dialogContext?.data?.pax || 6;
  protected readonly currentTime = new Date().toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  private readonly dialogService = inject(TuiDialogService);

  protected readonly activeCategoryId = signal<number | null>(null);

  protected readonly cartItems = signal<CartItem[]>([]);
  protected readonly discountPercent = signal<number>(0);
  protected readonly customDiscountCode = signal<string>('');
  protected readonly orderDescription = signal<string>('');
  protected readonly submitting = signal(false);

  protected readonly baseUrl = `${new URL(environment.apiUrl).origin}/`;
  protected readonly loading = signal(false);
  protected readonly noDishesFound = signal(false);

  protected readonly searchControl = new FormControl<string>('', { nonNullable: true });

  private readonly selectedCategoryId$ = new BehaviorSubject<number | null>(null);
  private readonly dishesCache = new Map<string, Observable<DishSearchResponse>>();

  private activeRequests = 0;

  private readonly searchTrigger$ = combineLatest([
    this.searchControl.valueChanges.pipe(
      startWith(this.searchControl.value),
      debounceTime(300),
      distinctUntilChanged(),
    ),
    this.selectedCategoryId$,
  ]).pipe(
    map(([searchString, categoryId]) => ({
      searchString: searchString.trim(),
      dishCategoryId: categoryId ?? undefined,
    })),
    shareReplay({ bufferSize: 1, refCount: false }),
  );

  protected readonly dishes$: Observable<DishItem[]> = this.searchTrigger$.pipe(
    switchMap((request) => {
      this.activeRequests += 1;
      this.loading.set(true);
      return this.searchDishesCached(request).pipe(
        finalize(() => {
          this.activeRequests = Math.max(0, this.activeRequests - 1);
          if (this.activeRequests === 0) {
            this.loading.set(false);
          }
        }),
      );
    }),
    map((response) => {
      const rows = response.data.rows;
      this.noDishesFound.set(rows.length === 0);
      return rows;
    }),
    startWith([]),
    shareReplay({ bufferSize: 1, refCount: false }),
  );

  protected readonly categories$: Observable<CategoryTab[]> = this.searchDishesCached({
    searchString: '',
  }).pipe(
    map((response) => {
      const categoryMap = new Map<number, string>();
      response.data.rows.forEach((dish) => {
        if (!categoryMap.has(dish.dishCategoryId)) {
          categoryMap.set(dish.dishCategoryId, dish.dishCategoryName);
        }
      });
      const tabs: CategoryTab[] = [{ id: null, name: 'Tất cả' }];
      Array.from(categoryMap.entries())
        .sort((a, b) => a[1].localeCompare(b[1]))
        .forEach(([id, name]) => tabs.push({ id, name }));
      return tabs;
    }),
    startWith([{ id: null, name: 'Tất cả' }]),
    shareReplay({ bufferSize: 1, refCount: false }),
  );

  protected readonly subtotal = computed(() =>
    this.cartItems().reduce((sum, item) => sum + item.dish.price * item.quantity, 0),
  );

  protected readonly discountAmount = computed(() =>
    Math.round((this.subtotal() * this.discountPercent()) / 100),
  );

  protected readonly total = computed(() => this.subtotal() - this.discountAmount());

  ngOnInit(): void {
    this.selectedCategoryId$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((id) => this.activeCategoryId.set(id));
  }

  protected selectCategory(categoryId: number | null): void {
    this.searchControl.setValue('');
    this.selectedCategoryId$.next(categoryId);
  }

  protected addToCart(dish: DishItem): void {
    this.cartItems.update((items) => {
      const existing = items.find((item) => item.dish.id === dish.id);
      if (existing) {
        return items.map((item) =>
          item.dish.id === dish.id
            ? { ...item, quantity: Math.min(item.quantity + 1, PosOrderDishes.MAX_QTY) }
            : item,
        );
      }
      return [...items, { dish, quantity: 1 }];
    });
  }

  protected removeFromCart(dishId: number): void {
    this.cartItems.update((items) => items.filter((item) => item.dish.id !== dishId));
  }

  protected updateQuantity(dishId: number, quantity: number): void {
    if (!Number.isFinite(quantity) || quantity <= 0) {
      this.removeFromCart(dishId);
      return;
    }

    const safeQuantity = Math.min(Math.floor(quantity), PosOrderDishes.MAX_QTY);
    this.cartItems.update((items) =>
      items.map((item) => (item.dish.id === dishId ? { ...item, quantity: safeQuantity } : item)),
    );
  }

  protected applyDiscount(percent: number): void {
    this.discountPercent.set(percent);
    this.customDiscountCode.set('');
  }

  protected applyCustomDiscount(): void {
    this.discountPercent.set(0);
  }

  protected close(): void {
    this.dialogContext?.completeWith(null);
  }

  protected confirmOrder(): void {
    const tableId = this.dialogContext?.data?.tableId;
    if (!tableId) {
      console.error('[PosOrderDishes] Missing tableId');
      return;
    }

    if (this.submitting()) {
      return;
    }

    const request: DishOrderCreateRequest = {
      tableId: tableId,
      description: this.orderDescription() || undefined,
      dishOrderDetails: this.cartItems().map((item) => ({
        dishId: item.dish.id,
        quantity: item.quantity,
        note: undefined,
      })),
    };

    this.submitting.set(true);
    this.dishService
      .createDishOrder(request)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (response) => {
          // 1. Đóng dialog đặt món hiện tại
          this.dialogContext?.completeWith(null);

          // 2. Chuẩn bị dữ liệu cho dialog thành công
          const successData: OrderDishesSuccessDialogInput = {
            dishOrderId: response.data.dishOrderId,
            tableName: this.tableName, // lấy từ dialog input hiện tại
            accountName: response.data.accountName,
            createdTime: response.data.createdTime,
            dishOrderStatusName: response.data.dishOrderStatusName,
            note: response.data.note,
            totalBill: response.data.totalBill,
            dishOrderDetails: response.data.dishOrderDetails.map((detail) => ({
              dishName: detail.dishName,
              quantity: detail.quantity,
              note: detail.note,
              totalPrice: detail.totalPrice,
              photo: detail.photo || null,
            })),
          };

          // 3. Mở dialog thành công
          this.dialogService
            .open<boolean>(new PolymorpheusComponent(OrderDishesSuccessDialog), {
              data: successData,
              dismissible: true, // cho phép click bên ngoài để đóng
              size: 'auto',
            })
            .subscribe({
              next: (result) => {
                // result = true nếu người dùng nhấn "In hóa đơn", false nếu chỉ đóng
                console.log('Success dialog closed with result:', result);
              },
            });
        },
        error: (err) => {
          console.error('[PosOrderDishes] Create order failed', err);
          // Hiển thị toast lỗi
        },
      });
  }

  private searchDishesCached(request: DishSearchRequest): Observable<DishSearchResponse> {
    const key = `${(request.searchString || '').toLowerCase()}|${request.dishCategoryId ?? 'all'}`;
    const cached = this.dishesCache.get(key);
    if (cached) {
      return cached;
    }

    if (this.dishesCache.size >= PosOrderDishes.MAX_CACHE_SIZE) {
      this.dishesCache.clear();
    }

    const request$ = this.dishService
      .searchDishes(request)
      .pipe(shareReplay({ bufferSize: 1, refCount: false }));
    this.dishesCache.set(key, request$);
    return request$;
  }
}
