/**
 * ============================================================
 * COMPONENT: PosOrderDishes (Dialog)
 * ============================================================
 *
 * MÔ TẢ NGHIỆP VỤ:
 *   Dialog "Đặt món" dành cho nhân viên POS (Point-of-Sale).
 *   Được mở khi nhân viên chọn một bàn đang hoạt động và muốn
 *   ghi nhận các món ăn/đồ uống mà khách gọi.
 *
 * ĐẦU VÀO (Input):
 *   Nhận từ dialog context:
 *     - tableId   : ID bàn đang phục vụ
 *     - tableName : Tên bàn (hiển thị trên UI)
 *     - pax       : Số lượng khách tại bàn
 *
 * HAI LUỒNG NGHIỆP VỤ CHÍNH:
 * -----------------------------------------------------------
 * Luồng A – "Lưu tạm đơn đặt món" (confirmOrder):
 *   Nhân viên chọn món → thêm vào giỏ → bấm "Lưu tạm đơn đặt món"
 *   → Hệ thống tạo DishOrder (trạng thái: PROCESSING)
 *   → Mở OrderDishesSuccessDialog hiển thị xác nhận
 *   → Bếp/bar nhận lệnh chuẩn bị món
 *   Dùng khi: Khách chưa thanh toán ngay, món sẽ được làm sau.
 *
 * Luồng B – "Thanh toán ngay" (orderAndPayNow):
 *   Nhân viên chọn món → thêm vào giỏ → bấm "Thanh toán ngay"
 *   → Bước 1: Tạo DishOrder (PROCESSING)
 *   → Bước 2: Tự động cập nhật trạng thái → DONE (ngầm, không cần bếp xác nhận)
 *   → Bước 3: Mở PosConfirmPayment để chọn phương thức thanh toán
 *   → Bước 4: Sau khi xác nhận thanh toán → Mở PaymentSuccessDialog
 *   Dùng khi: Khách lấy đồ uống nhanh / take-away / thanh toán tại quầy ngay.
 *
 * KẾT QUẢ TRẢ VỀ (Output):
 *   - null: Nhân viên đóng dialog (không tạo đơn)
 *   - Luồng A/B: Kết quả được xử lý nội bộ qua các dialog con,
 *     dialog cha nhận null từ completeWith()
 * ============================================================
 */

import { AsyncPipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  Injector,
  OnInit,
  signal,
} from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TuiDialogContext, TuiDialogService, TuiAlertService } from '@taiga-ui/core';
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
import { PaymentData } from '../../../../core/models/payment/payment.model';
import { PosOrderDishesService } from '../../../../core/services/POS/pos-order-dishes/pos-order-dishes.service';
import { OrderDishesHistoryService } from '../../../../core/services/order-dishes/order-dishes.service';
import {
  OrderDishesSuccessDialog,
  OrderDishesSuccessDialogInput,
} from '../order-dishes-success-dialog/order-dishes-success-dialog';
import {
  PosConfirmPayment,
  PosConfirmPaymentResult,
} from '../pos-confirm-payment/pos-confirm-payment';
import {
  PaymentSuccessDialog,
  PaymentSuccessDialogInput,
} from '../payment-success-dialog/payment-success-dialog';

/** Dữ liệu đầu vào khi mở dialog đặt món từ màn hình POS */
export interface PosOrderDishesDialogInput {
  tableId: number;
  tableName: string;
  pax: number;
}

/** Tab danh mục món: id=null nghĩa là "Tất cả" */
interface CategoryTab {
  id: number | null;
  name: string;
}

/** Một dòng trong giỏ hàng: món + số lượng + ghi chú riêng từng món */
export interface CartItem {
  dish: DishItem;
  quantity: number;
  note?: string;
}

/** Kết quả trả về khi đóng dialog (hiện tại không dùng, luồng xử lý qua dialog con) */
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
  /** Giới hạn cache tìm kiếm món để tránh memory leak */
  private static readonly MAX_CACHE_SIZE = 50;
  /** Số lượng tối đa của một món trong giỏ hàng */
  private static readonly MAX_QTY = 99;

  // --- DI ---
  private readonly dialogContext = inject(POLYMORPHEUS_CONTEXT, {
    optional: true,
  }) as TuiDialogContext<PosOrderDishesDialogResult | null, PosOrderDishesDialogInput> | null;
  private readonly dishService = inject(PosOrderDishesService);
  private readonly orderHistoryService = inject(OrderDishesHistoryService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly alert = inject(TuiAlertService);
  private readonly injector = inject(Injector);

  // --- Thông tin bàn từ dialog context ---
  protected readonly tableName = this.dialogContext?.data?.tableName || 'Ban 3';
  protected readonly pax = this.dialogContext?.data?.pax || 6;
  /** Thời điểm mở dialog – hiển thị lên header để nhân viên tham chiếu */
  protected readonly currentTime = new Date().toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  private readonly dialogService = inject(TuiDialogService);

  // --- Trạng thái UI ---
  /** Danh mục đang được lọc (null = Tất cả) */
  protected readonly activeCategoryId = signal<number | null>(null);

  /** Danh sách món đã thêm vào giỏ hàng */
  protected readonly cartItems = signal<CartItem[]>([]);
  /** % giảm giá đang áp dụng (0 = không giảm) */
  protected readonly discountPercent = signal<number>(0);
  /** Mã giảm giá tùy chỉnh nhân viên nhập tay */
  protected readonly customDiscountCode = signal<string>('');
  /** Ghi chú chung cho toàn bộ đơn hàng */
  protected readonly orderDescription = signal<string>('');
  /** Trạng thái đang gửi API (ngăn double-submit) */
  protected readonly submitting = signal(false);

  protected readonly baseUrl = `${new URL(environment.apiUrl).origin}/`;
  /** Đang tải danh sách món từ API */
  protected readonly loading = signal(false);
  /** Không tìm thấy món nào phù hợp với bộ lọc hiện tại */
  protected readonly noDishesFound = signal(false);

  /** FormControl cho ô tìm kiếm món – debounce 300ms tránh gọi API liên tục */
  protected readonly searchControl = new FormControl<string>('', { nonNullable: true });

  /** Subject phát ID danh mục khi nhân viên bấm tab lọc */
  private readonly selectedCategoryId$ = new BehaviorSubject<number | null>(null);

  /**
   * Cache kết quả tìm kiếm theo key "searchString|categoryId".
   * Giúp tránh gọi API lặp lại khi nhân viên quay lại tab/từ khóa cũ.
   */
  private readonly dishesCache = new Map<string, Observable<DishSearchResponse>>();

  /** Đếm số request đang chạy song song để xác định khi nào ẩn spinner */
  private activeRequests = 0;

  /**
   * Stream tổng hợp tín hiệu tìm kiếm:
   * Kết hợp từ khóa tìm kiếm (debounce) + danh mục đang chọn.
   * Phát mỗi khi một trong hai thay đổi → kích hoạt dishes$ tải lại.
   */
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

  /**
   * Stream danh sách món hiển thị trên lưới sản phẩm.
   * Mỗi khi searchTrigger$ phát → hủy request cũ (switchMap) → gọi API mới.
   * Hiển thị spinner khi đang tải, báo "không tìm thấy" nếu kết quả rỗng.
   */
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

  /**
   * Stream danh sách tab danh mục.
   * Tải một lần khi dialog mở (lấy toàn bộ món, trích xuất danh mục duy nhất).
   * Sắp xếp theo tên và thêm tab "Tất cả" ở đầu.
   */
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

  // --- Tính toán giá trị giỏ hàng (computed signals) ---

  /** Tạm tính = tổng (đơn giá × số lượng) từng món trong giỏ */
  protected readonly subtotal = computed(() =>
    this.cartItems().reduce((sum, item) => sum + item.dish.price * item.quantity, 0),
  );

  /** Số tiền giảm = tạm tính × % giảm giá */
  protected readonly discountAmount = computed(() =>
    Math.round((this.subtotal() * this.discountPercent()) / 100),
  );

  /** Tổng cộng = tạm tính − số tiền giảm */
  protected readonly total = computed(() => this.subtotal() - this.discountAmount());

  ngOnInit(): void {
    // Đồng bộ selectedCategoryId$ → activeCategoryId signal để template có thể bind
    this.selectedCategoryId$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((id) => this.activeCategoryId.set(id));
  }

  /**
   * Nhân viên bấm một tab danh mục → lọc lại danh sách món.
   * Reset ô tìm kiếm để tránh filter chồng chéo.
   */
  protected selectCategory(categoryId: number | null): void {
    this.searchControl.setValue('');
    this.selectedCategoryId$.next(categoryId);
  }

  /**
   * Thêm món vào giỏ hàng.
   * - Nếu món đã có: tăng số lượng (tối đa MAX_QTY).
   * - Nếu chưa có: tạo dòng mới với quantity = 1.
   */
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

  /**
   * Xóa hoàn toàn một món ra khỏi giỏ hàng.
   * Được gọi khi nhân viên bấm nút xóa (🗑) hoặc khi quantity giảm về 0.
   */
  protected removeFromCart(dishId: number): void {
    this.cartItems.update((items) => items.filter((item) => item.dish.id !== dishId));
  }

  /**
   * Cập nhật số lượng của một món trong giỏ.
   * - quantity ≤ 0 hoặc không hợp lệ → xóa món khỏi giỏ.
   * - quantity > MAX_QTY → clamp về MAX_QTY.
   * - Làm tròn xuống số nguyên (không cho số thập phân).
   */
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

  /**
   * Áp dụng % giảm giá nhanh (0%, 10%, 15%, 20%).
   * Reset mã giảm giá tùy chỉnh vì hai cơ chế không dùng cùng lúc.
   */
  protected applyDiscount(percent: number): void {
    this.discountPercent.set(percent);
    this.customDiscountCode.set('');
  }

  /**
   * Áp dụng mã giảm giá tùy chỉnh.
   * Hiện tại chỉ reset discountPercent về 0 (chức năng validate mã sẽ bổ sung sau).
   */
  protected applyCustomDiscount(): void {
    this.discountPercent.set(0);
  }

  /**
   * Nhân viên hủy / đóng dialog mà không lưu đơn.
   * Trả về null cho dialog cha.
   */
  protected close(): void {
    this.dialogContext?.completeWith(null);
  }

  /**
   * ================================================================
   * LUỒNG A: Lưu tạm đơn đặt món
   * ================================================================
   * User Story:
   *   "Là nhân viên POS, tôi muốn ghi nhận món khách gọi vào hệ thống
   *    để bếp/bar biết cần chuẩn bị, mà chưa cần thanh toán ngay."
   *
   * Luồng:
   *   1. Kiểm tra tableId và trạng thái submitting (chống double-click)
   *   2. Gọi API createDishOrder → DishOrder tạo với status PROCESSING
   *   3. Đóng dialog đặt món hiện tại
   *   4. Mở OrderDishesSuccessDialog:
   *      - Hiển thị xác nhận đơn hàng (tên bàn, danh sách món, tổng tiền)
   *      - Nhân viên xem lại và bấm đóng
   *   5. Lỗi → hiển thị alert thông báo lỗi, không đóng dialog
   * ================================================================
   */
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
        note: item.note || undefined,
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
            tableName: this.tableName,
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

          // 3. Mở dialog thành công → nhân viên xem xác nhận đơn hàng
          this.dialogService
            .open<boolean>(new PolymorpheusComponent(OrderDishesSuccessDialog), {
              data: successData,
              dismissible: true,
              size: 'auto',
            })
            .subscribe({
              next: (result) => {
                console.log('Success dialog closed with result:', result);
              },
            });
        },
        error: (err) => {
          console.error('[PosOrderDishes] Create order failed', err);
          const message = err?.error?.message || 'Lưu đơn đặt món thất bại. Vui lòng thử lại.';
          this.alert
            .open(message, { label: 'Lỗi', appearance: 'negative', autoClose: 5000, closeable: true })
            .subscribe();
        },
      });
  }

  /**
   * ================================================================
   * LUỒNG B: Thanh toán ngay (Quick Checkout)
   * ================================================================
   * User Story:
   *   "Là nhân viên POS, tôi muốn tạo đơn và thanh toán ngay trong
   *    một thao tác liên tục, không cần đợi bếp xác nhận hoàn thành."
   *
   * Luồng (2 API gọi ngầm trước khi mở UI thanh toán):
   *   Bước 1 – Tạo DishOrder:
   *     POST /dish-orders → DishOrder mới (status: PROCESSING)
   *   Bước 2 – Tự động chuyển trạng thái sang DONE:
   *     PUT /dish-orders/status-bulk { ids: [orderId], status: 'DONE' }
   *     (Bỏ qua bước bếp xác nhận – phù hợp đồ uống nhanh / take-away)
   *   Bước 3 – Mở PosConfirmPayment:
   *     Nhân viên chọn phương thức thanh toán (tiền mặt / chuyển khoản...)
   *     và xác nhận tổng tiền
   *   Bước 4 – Thanh toán thành công → Mở PaymentSuccessDialog:
   *     Hiển thị hóa đơn, thông tin giao dịch
   *   Lỗi ở Bước 1 hoặc 2 → alert lỗi, không mở dialog thanh toán
   * ================================================================
   */
  protected orderAndPayNow(): void {
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
        note: item.note || undefined,
      })),
    };

    this.submitting.set(true);

    // Bước 1 → Bước 2: Tạo order rồi ngay lập tức chuyển sang DONE
    this.dishService
      .createDishOrder(request)
      .pipe(
        switchMap((createResponse) => {
          const orderId = createResponse.data.dishOrderId;
          // Cập nhật trạng thái sang DONE để hợp lệ cho thanh toán
          return this.orderHistoryService
            .updateStatusBulk({ dishOrderIds: [orderId], dishOrderStatus: 'DONE' })
            .pipe(map(() => orderId));
        }),
        finalize(() => this.submitting.set(false)),
      )
      .subscribe({
        next: (orderId) => {
          // Bước 3: Đóng dialog đặt món + mở PosConfirmPayment
          this.dialogContext?.completeWith(null);
          this.openPaymentConfirmDialog(orderId);
        },
        error: (err) => {
          console.error('[PosOrderDishes] Quick checkout failed', err);
          const message = err?.error?.message || 'Tạo đơn thanh toán thất bại. Vui lòng thử lại.';
          this.alert
            .open(message, { label: 'Lỗi', appearance: 'negative', autoClose: 5000, closeable: true })
            .subscribe();
        },
      });
  }

  /**
   * Mở PosConfirmPayment dialog để nhân viên xác nhận thanh toán.
   * - dismissible: false → bắt buộc nhân viên phải xử lý (không tắt bằng click ngoài)
   * - result !== null → thanh toán thành công → chuyển sang PaymentSuccessDialog
   * - result === null → nhân viên hủy (hiếm gặp vì dialog không dismissible)
   */
  private openPaymentConfirmDialog(orderId: number): void {
    this.dialogService
      .open<PosConfirmPaymentResult>(
        new PolymorpheusComponent(PosConfirmPayment, this.injector),
        {
          data: { orderId },
          size: 'auto',
          dismissible: false,
          closeable: false,
        },
      )
      .subscribe((result: PosConfirmPaymentResult) => {
        if (result) {
          // Thanh toán thành công → mở PaymentSuccessDialog
          this.openPaymentSuccessDialog(result);
        }
        // result === null → người dùng đóng/hủy
      });
  }

  /**
   * Mở PaymentSuccessDialog hiển thị hóa đơn sau thanh toán thành công.
   * Sau khi dialog đóng → hiển thị toast "Thanh toán thành công!" xác nhận.
   */
  private openPaymentSuccessDialog(paymentData: PaymentData): void {
    const successInput: PaymentSuccessDialogInput = {
      paymentData,
      tableName: this.tableName,
    };

    this.dialogService
      .open<boolean | null>(
        new PolymorpheusComponent(PaymentSuccessDialog, this.injector),
        {
          data: successInput,
          size: 'auto',
          dismissible: true,
        },
      )
      .subscribe(() => {
        this.alert
          .open('Thanh toán thành công!', { label: 'Thành công', appearance: 'positive', autoClose: 3000, closeable: true })
          .subscribe();
      });
  }

  /**
   * Tìm kiếm món có cache theo key "searchString|categoryId".
   * - Cache hit: trả về Observable đã lưu (không gọi API lại).
   * - Cache full (≥ MAX_CACHE_SIZE): xóa toàn bộ cache rồi thêm mới.
   * - Cache miss: gọi API, lưu kết quả vào cache với shareReplay(1).
   */
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
