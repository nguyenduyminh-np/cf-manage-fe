import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  PaymentRequest,
  PaymentApiResponse,
  PaymentPreviewApiResponse,
  PaymentPreviewRequest,
} from '../../../models/payment/payment.model';

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly http = inject(HttpClient);

  /**
   * Lấy thông tin xem trước thanh toán cho một đơn hàng.
   * @param orderId Mã đơn hàng
   */
  getPaymentPreview(orderId: number): Observable<PaymentPreviewApiResponse> {
    const body: PaymentPreviewRequest = { orderId };
    return this.http.post<PaymentPreviewApiResponse>('/payment/preview', body);
  }

  /**
   * Xác nhận thanh toán và tạo hóa đơn.
   * @param orderId Mã đơn hàng
   * @param paymentMethod Phương thức thanh toán: "CASH" | "BANK_TRANSFER"
   */
  processPayment(orderId: number, paymentMethod: string): Observable<PaymentApiResponse> {
    const body: PaymentRequest = { orderId, paymentMethod };
    return this.http.post<PaymentApiResponse>('/payment/thanh-toan', body);
  }
}
