import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  DashboardApiResponse,
  DashboardKpi,
  RevenueDayPoint,
  OrdersByHourPoint,
  OrderStatusDistribution,
  TopDish,
  TableStatusByFloor,
  DebtBySupplier,
  ProcessingOrder,
  UpcomingBooking,
  StockAlert,
  PendingInvoice,
  DraftPurchaseOrder,
  PendingBooking,
} from '../../models/dashboard/dashboard.model';

const BASE = '/dashboard';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);

  // ─── KPI ───
  getKpi(): Observable<DashboardKpi> {
    return this.http
      .post<DashboardApiResponse<DashboardKpi>>(`${BASE}/kpi`, null)
      .pipe(map((r) => r.data));
  }

  // ─── Charts ───
  getRevenueLast7Days(): Observable<RevenueDayPoint[]> {
    return this.http
      .post<DashboardApiResponse<RevenueDayPoint[]>>(`${BASE}/chart/revenue-last-7-days`, null)
      .pipe(map((r) => r.data));
  }

  getOrdersByHour(): Observable<OrdersByHourPoint[]> {
    return this.http
      .post<DashboardApiResponse<OrdersByHourPoint[]>>(`${BASE}/chart/orders-by-hour`, null)
      .pipe(map((r) => r.data));
  }

  getOrderStatusDistribution(): Observable<OrderStatusDistribution[]> {
    return this.http
      .post<DashboardApiResponse<OrderStatusDistribution[]>>(`${BASE}/chart/order-status-distribution`, null)
      .pipe(map((r) => r.data));
  }

  getTopDishes(): Observable<TopDish[]> {
    return this.http
      .post<DashboardApiResponse<TopDish[]>>(`${BASE}/chart/top-dishes`, null)
      .pipe(map((r) => r.data));
  }

  getTableStatusByFloor(): Observable<TableStatusByFloor[]> {
    return this.http
      .post<DashboardApiResponse<TableStatusByFloor[]>>(`${BASE}/chart/table-status-by-floor`, null)
      .pipe(map((r) => r.data));
  }

  getDebtBySupplier(): Observable<DebtBySupplier[]> {
    return this.http
      .post<DashboardApiResponse<DebtBySupplier[]>>(`${BASE}/chart/debt-by-supplier`, null)
      .pipe(map((r) => r.data));
  }

  // ─── Quick Tables ───
  getProcessingOrders(): Observable<ProcessingOrder[]> {
    return this.http
      .post<DashboardApiResponse<ProcessingOrder[]>>(`${BASE}/table/processing-orders`, null)
      .pipe(map((r) => r.data));
  }

  getUpcomingBookings(): Observable<UpcomingBooking[]> {
    return this.http
      .post<DashboardApiResponse<UpcomingBooking[]>>(`${BASE}/table/upcoming-bookings`, null)
      .pipe(map((r) => r.data));
  }

  getStockAlerts(): Observable<StockAlert[]> {
    return this.http
      .post<DashboardApiResponse<StockAlert[]>>(`${BASE}/table/stock-alerts`, null)
      .pipe(map((r) => r.data));
  }

  getPendingInvoices(): Observable<PendingInvoice[]> {
    return this.http
      .post<DashboardApiResponse<PendingInvoice[]>>(`${BASE}/table/pending-invoices`, null)
      .pipe(map((r) => r.data));
  }

  getDraftPurchaseOrders(): Observable<DraftPurchaseOrder[]> {
    return this.http
      .post<DashboardApiResponse<DraftPurchaseOrder[]>>(`${BASE}/table/draft-purchase-orders`, null)
      .pipe(map((r) => r.data));
  }

  getPendingBookings(): Observable<PendingBooking[]> {
    return this.http
      .post<DashboardApiResponse<PendingBooking[]>>(`${BASE}/table/pending-bookings`, null)
      .pipe(map((r) => r.data));
  }

  // ─── Batch loaders ───
  loadAllCharts() {
    return forkJoin({
      revenue: this.getRevenueLast7Days(),
      ordersByHour: this.getOrdersByHour(),
      orderStatus: this.getOrderStatusDistribution(),
      topDishes: this.getTopDishes(),
      tableStatus: this.getTableStatusByFloor(),
      debtBySupplier: this.getDebtBySupplier(),
    });
  }

  loadAllTables() {
    return forkJoin({
      processingOrders: this.getProcessingOrders(),
      upcomingBookings: this.getUpcomingBookings(),
      stockAlerts: this.getStockAlerts(),
      pendingInvoices: this.getPendingInvoices(),
      draftPurchaseOrders: this.getDraftPurchaseOrders(),
      pendingBookings: this.getPendingBookings(),
    });
  }
}
