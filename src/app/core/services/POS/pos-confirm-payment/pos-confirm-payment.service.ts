import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  PaymentRequest,
  PaymentApiResponse,
  PaymentPreviewApiResponse,
} from '../../../models/payment/payment.model';

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly http = inject(HttpClient);

  /**
   * Preview thanh toán đơn hàng (có thể kèm voucherCode để xem trước giảm giá).
   * Endpoint này KHÔNG thay đổi database.
   */
  getPaymentPreview(orderId: number, voucherCode?: string | null): Observable<PaymentPreviewApiResponse> {
    let params = new HttpParams().set('orderId', orderId);
    if (voucherCode) {
      params = params.set('voucherCode', voucherCode);
    }
    return this.http.post<PaymentPreviewApiResponse>(
      '/dish-order/payment/preview-with-voucher',
      null,
      { params },
    );
  }

  /**
   * Xác nhận thanh toán đơn hàng đã tồn tại (đã có DishOrder từ trước).
   * Dùng khi: khách đã order, nhân viên mở modal thanh toán qua PosConfirmPayment.
   * Endpoint: POST /payment/thanh-toan
   */
  processPayment(
    orderId: number,
    paymentMethod: string,
    voucherCode?: string | null,
  ): Observable<PaymentApiResponse> {
    const body: PaymentRequest = { orderId, paymentMethod, voucherCode: voucherCode || null };
    return this.http.post<PaymentApiResponse>('/payment/thanh-toan', body);
  }
}
