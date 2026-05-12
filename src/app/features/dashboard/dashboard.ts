import {
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgxEchartsDirective } from 'ngx-echarts';
import { EChartsOption } from 'echarts';
import dayjs from 'dayjs';

import { DashboardService } from '../../core/services/dashboard/dashboard.service';
import { TokenStore } from '../../core/services/auth/token.store';
import {
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
} from '../../core/models/dashboard/dashboard.model';

// ─── KPI Card config ───
interface KpiCard {
  title: string;
  value: string;
  icon: string;
  alertLevel: 'normal' | 'warning' | 'danger';
  subtitle: string;
  subtitleIcon: string | null;
}

// ─── Quick Table Tab ───
type QuickTab = 'kitchen' | 'bookings' | 'inventory' | 'purchases' | 'pending-bookings';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [NgxEchartsDirective],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly tokenStore = inject(TokenStore);

  /** True nếu user là ADMIN hoặc bất kỳ manager (QL-xxx). */
  protected readonly isAdminOrManager = computed(() => {
    const role = this.tokenStore.role();
    if (!role) return false;
    return role === 'ADMIN' || role.startsWith('QL-');
  });

  // ─── State Signals ───
  protected readonly isLoading = signal(true);
  protected readonly kpi = signal<DashboardKpi | null>(null);

  // Charts raw data
  private readonly rawRevenue = signal<RevenueDayPoint[]>([]);
  private readonly rawOrdersByHour = signal<OrdersByHourPoint[]>([]);
  private readonly rawOrderStatus = signal<OrderStatusDistribution[]>([]);
  private readonly rawTopDishes = signal<TopDish[]>([]);
  private readonly rawTableStatus = signal<TableStatusByFloor[]>([]);
  private readonly rawDebtBySupplier = signal<DebtBySupplier[]>([]);

  // Quick Tables data
  protected readonly processingOrders = signal<ProcessingOrder[]>([]);
  protected readonly upcomingBookings = signal<UpcomingBooking[]>([]);
  protected readonly stockAlerts = signal<StockAlert[]>([]);
  protected readonly draftPurchaseOrders = signal<DraftPurchaseOrder[]>([]);
  protected readonly pendingBookings = signal<PendingBooking[]>([]);

  // Active tab
  protected readonly activeTab = signal<QuickTab>('kitchen');

  // ─── Design tokens for charts ───
  private readonly chartColors = {
    primary: '#33210d',
    secondary: '#1b6d24',
    tertiary: '#8b5500',
    error: '#ba1a1a',
    green: '#2e8b34',
    greenLight: 'rgba(46,139,52,0.15)',
    brown: '#6e5a55',
    brownLight: 'rgba(110,90,85,0.15)',
    orange: '#c77826',
    orangeLight: 'rgba(199,120,38,0.15)',
    surface: '#faf9f6',
    surfaceContainer: '#efeeeb',
    textMuted: '#5f5e5b',
    border: 'rgba(210,196,186,0.28)',
  };

  // ─── Computed: KPI Cards ───
  protected readonly kpiCards = computed<KpiCard[]>(() => {
    const k = this.kpi();
    if (!k) return [];

    return [
      {
        title: 'Doanh thu ngày',
        value: this.formatCurrency(k.revenueToday),
        icon: 'payments',
        alertLevel: 'normal' as const,
        subtitle: `${k.paidOrdersToday} đơn đã TT`,
        subtitleIcon: 'check_circle',
      },
      {
        title: 'Tổng đơn hàng',
        value: `${k.totalOrdersToday}`,
        icon: 'receipt_long',
        alertLevel: 'normal' as const,
        subtitle: `${k.paidOrdersToday} đơn đã TT`,
        subtitleIcon: null,
      },
      {
        title: 'Bàn đang phục vụ',
        value: `${k.occupiedTables}`,
        icon: 'chair',
        alertLevel: 'normal' as const,
        subtitle: 'Đang có khách',
        subtitleIcon: null,
      },
      {
        title: 'Nhân viên trực',
        value: `${k.activeStaff}`,
        icon: 'badge',
        alertLevel: 'normal' as const,
        subtitle: 'Đang hoạt động',
        subtitleIcon: null,
      },
      {
        title: 'Đơn chế biến',
        value: `${k.processingOrders} đơn`,
        icon: 'restaurant',
        alertLevel: k.processingOrders > 5 ? ('warning' as const) : ('normal' as const),
        subtitle: k.processingOrders > 5 ? 'Cần tăng tốc' : 'Đang xử lý',
        subtitleIcon: k.processingOrders > 5 ? 'warning' : null,
      },
      {
        title: 'Nợ nhà cung cấp',
        value: this.formatCurrency(k.totalSupplierDebt),
        icon: 'account_balance_wallet',
        alertLevel: k.totalSupplierDebt > 10000000 ? ('danger' as const) : ('warning' as const),
        subtitle: k.totalSupplierDebt > 10000000 ? 'Cảnh báo cao' : 'Đang theo dõi',
        subtitleIcon: k.totalSupplierDebt > 10000000 ? 'error' : 'warning',
      },
      {
        title: 'Tồn kho sắp hết hạn',
        value: `${k.expiringSoonStock} lô`,
        icon: 'warning',
        alertLevel: k.expiringSoonStock > 0 ? ('danger' as const) : ('normal' as const),
        subtitle: k.expiringSoonStock > 0 ? 'Cần xử lý' : 'Ổn định',
        subtitleIcon: k.expiringSoonStock > 0 ? 'error' : 'check_circle',
      },
      {
        title: 'Đặt bàn sắp tới',
        value: `${k.upcomingBookings}`,
        icon: 'event',
        alertLevel: 'normal' as const,
        subtitle: 'Trong 2 giờ tới',
        subtitleIcon: null,
      },
    ];
  });

  // ─── Computed: Chart Options ───
  protected readonly revenueChartOptions = computed<EChartsOption>(() => {
    const raw = this.rawRevenue();
    const filled = this.fillMissingDays(raw);

    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: this.chartColors.surface,
        borderColor: this.chartColors.border,
        textStyle: { color: this.chartColors.primary, fontFamily: 'Inter' },
        formatter: (params: any) => {
          const p = Array.isArray(params) ? params[0] : params;
          return `<b>${p.name}</b><br/>Doanh thu: ${this.formatCurrency(p.value)}`;
        },
      },
      grid: { left: 12, right: 12, top: 12, bottom: 28, containLabel: true },
      xAxis: {
        type: 'category',
        data: filled.map((d) => dayjs(d.date).format('DD/MM')),
        axisLine: { lineStyle: { color: this.chartColors.border } },
        axisLabel: { color: this.chartColors.textMuted, fontSize: 11 },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        show: false,
      },
      series: [
        {
          type: 'line',
          data: filled.map((d) => d.dailyRevenue),
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: { width: 3, color: this.chartColors.green },
          itemStyle: { color: this.chartColors.green },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(46,139,52,0.25)' },
                { offset: 1, color: 'rgba(46,139,52,0.02)' },
              ],
            },
          },
        },
      ],
    };
  });

  protected readonly hourlyOrdersChartOptions = computed<EChartsOption>(() => {
    const raw = this.rawOrdersByHour();
    const filled = this.fillMissingHours(raw);

    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: this.chartColors.surface,
        borderColor: this.chartColors.border,
        textStyle: { color: this.chartColors.primary, fontFamily: 'Inter' },
        formatter: (params: any) => {
          const p = Array.isArray(params) ? params[0] : params;
          return `<b>${p.name}h</b><br/>Số đơn: ${p.value}`;
        },
      },
      grid: { left: 12, right: 12, top: 12, bottom: 28, containLabel: true },
      xAxis: {
        type: 'category',
        data: filled.map((d) => `${d.hour}h`),
        axisLine: { lineStyle: { color: this.chartColors.border } },
        axisLabel: { color: this.chartColors.textMuted, fontSize: 10, interval: 2 },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        show: false,
      },
      series: [
        {
          type: 'bar',
          data: filled.map((d) => d.orderCount),
          barWidth: '50%',
          barMaxWidth: 18,
          itemStyle: {
            color: this.chartColors.green,
            borderRadius: [4, 4, 0, 0],
          },
          emphasis: {
            itemStyle: { color: '#1b6d24' },
          },
        },
      ],
    };
  });

  protected readonly orderStatusChartOptions = computed<EChartsOption>(() => {
    const raw = this.rawOrderStatus();
    const statusColors: Record<string, string> = {
      'Đang chế biến': this.chartColors.orange,
      'Hoàn thành': this.chartColors.green,
      'Đã thanh toán': this.chartColors.brown,
      'Đã hủy': this.chartColors.error,
    };

    return {
      tooltip: {
        trigger: 'item',
        backgroundColor: this.chartColors.surface,
        borderColor: this.chartColors.border,
        textStyle: { color: this.chartColors.primary, fontFamily: 'Inter' },
        formatter: '{b}: {c} đơn ({d}%)',
      },
      legend: { show: false },
      series: [
        {
          type: 'pie',
          radius: ['48%', '78%'],
          center: ['50%', '50%'],
          avoidLabelOverlap: false,
          label: { show: false },
          emphasis: {
            label: { show: true, fontSize: 13, fontWeight: 'bold' },
          },
          data: raw.map((d) => ({
            name: d.status,
            value: d.orderCount,
            itemStyle: { color: statusColors[d.status] || this.chartColors.textMuted },
          })),
        },
      ],
    };
  });

  protected readonly topDishesChartOptions = computed<EChartsOption>(() => {
    const raw = this.rawTopDishes();
    const reversed = [...raw].reverse();

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: this.chartColors.surface,
        borderColor: this.chartColors.border,
        textStyle: { color: this.chartColors.primary, fontFamily: 'Inter' },
        formatter: (params: any) => {
          const p = Array.isArray(params) ? params[0] : params;
          return `<b>${p.name}</b><br/>Số lượng: ${p.value}`;
        },
      },
      grid: { left: 8, right: 36, top: 8, bottom: 8, containLabel: true },
      xAxis: { type: 'value', show: false },
      yAxis: {
        type: 'category',
        data: reversed.map((d) => d.dishName),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: this.chartColors.primary,
          fontSize: 11,
          width: 100,
          overflow: 'truncate',
        },
      },
      series: [
        {
          type: 'bar',
          data: reversed.map((d) => d.totalQuantity),
          barWidth: '55%',
          barMaxWidth: 22,
          itemStyle: {
            color: this.chartColors.brown,
            borderRadius: [0, 4, 4, 0],
          },
          label: {
            show: true,
            position: 'right',
            color: this.chartColors.textMuted,
            fontSize: 11,
          },
        },
      ],
    };
  });

  protected readonly tableStatusChartOptions = computed<EChartsOption>(() => {
    const raw = this.rawTableStatus();

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: this.chartColors.surface,
        borderColor: this.chartColors.border,
        textStyle: { color: this.chartColors.primary, fontFamily: 'Inter' },
      },
      legend: {
        data: ['Có khách', 'Trống'],
        bottom: 0,
        textStyle: { color: this.chartColors.textMuted, fontSize: 11 },
        itemWidth: 12,
        itemHeight: 12,
        icon: 'roundRect',
      },
      grid: { left: 12, right: 12, top: 12, bottom: 36, containLabel: true },
      xAxis: {
        type: 'category',
        data: raw.map((d) => `Tầng ${d.floor}`),
        axisLine: { lineStyle: { color: this.chartColors.border } },
        axisLabel: { color: this.chartColors.textMuted, fontSize: 11 },
        axisTick: { show: false },
      },
      yAxis: { type: 'value', show: false },
      series: [
        {
          name: 'Có khách',
          type: 'bar',
          stack: 'total',
          data: raw.map((d) => d.occupied),
          itemStyle: { color: this.chartColors.orange, borderRadius: [0, 0, 0, 0] },
          barMaxWidth: 32,
        },
        {
          name: 'Trống',
          type: 'bar',
          stack: 'total',
          data: raw.map((d) => d.available),
          itemStyle: { color: this.chartColors.greenLight, borderRadius: [4, 4, 0, 0] },
          barMaxWidth: 32,
        },
      ],
    };
  });

  protected readonly debtChartOptions = computed<EChartsOption>(() => {
    const raw = this.rawDebtBySupplier();
    const pieColors = ['#6e5a55', '#8b5500', '#33210d', '#ba1a1a', '#1b6d24', '#c77826'];

    return {
      tooltip: {
        trigger: 'item',
        backgroundColor: this.chartColors.surface,
        borderColor: this.chartColors.border,
        textStyle: { color: this.chartColors.primary, fontFamily: 'Inter' },
        formatter: (params: any) => `<b>${params.name}</b><br/>${this.formatCurrency(params.value)} (${params.percent}%)`,
      },
      legend: { show: false },
      series: [
        {
          type: 'pie',
          radius: ['40%', '75%'],
          center: ['50%', '50%'],
          avoidLabelOverlap: false,
          label: { show: false },
          emphasis: {
            label: { show: true, fontSize: 12, fontWeight: 'bold' },
          },
          data: raw.map((d, i) => ({
            name: d.supplierName,
            value: d.debtAmount,
            itemStyle: { color: pieColors[i % pieColors.length] },
          })),
        },
      ],
    };
  });

  // ─── Lifecycle ───
  ngOnInit(): void {
    this.loadDashboard();
  }

  // ─── Data Loading ───
  private loadDashboard(): void {
    this.isLoading.set(true);

    // 1. KPI
    this.dashboardService
      .getKpi()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => this.kpi.set(data),
        error: () => console.error('Failed to load KPI'),
      });

    // 2. Charts (parallel)
    this.dashboardService
      .loadAllCharts()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.rawRevenue.set(data.revenue);
          this.rawOrdersByHour.set(data.ordersByHour);
          this.rawOrderStatus.set(data.orderStatus);
          this.rawTopDishes.set(data.topDishes);
          this.rawTableStatus.set(data.tableStatus);
          this.rawDebtBySupplier.set(data.debtBySupplier);
        },
        error: () => console.error('Failed to load charts'),
      });

    // 3. Quick Tables (parallel)
    this.dashboardService
      .loadAllTables()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.processingOrders.set(data.processingOrders);
          this.upcomingBookings.set(data.upcomingBookings);
          this.stockAlerts.set(data.stockAlerts);
          this.draftPurchaseOrders.set(data.draftPurchaseOrders);
          this.pendingBookings.set(data.pendingBookings);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          console.error('Failed to load tables');
        },
      });
  }

  // ─── Tab switching ───
  protected setTab(tab: QuickTab): void {
    this.activeTab.set(tab);
  }

  // ─── Refresh ───
  protected refreshDashboard(): void {
    this.loadDashboard();
  }

  // ─── Helper: Fill missing days ───
  private fillMissingDays(data: RevenueDayPoint[]): RevenueDayPoint[] {
    const map = new Map(data.map((d) => [d.date, d.dailyRevenue]));
    const result: RevenueDayPoint[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = dayjs().subtract(i, 'day').format('YYYY-MM-DD');
      result.push({ date, dailyRevenue: map.get(date) ?? 0 });
    }
    return result;
  }

  // ─── Helper: Fill missing hours ───
  private fillMissingHours(data: OrdersByHourPoint[]): OrdersByHourPoint[] {
    const map = new Map(data.map((d) => [d.hour, d.orderCount]));
    const result: OrdersByHourPoint[] = [];
    for (let h = 0; h <= 23; h++) {
      result.push({ hour: h, orderCount: map.get(h) ?? 0 });
    }
    return result;
  }

  // ─── Formatters ───
  protected formatCurrency(value: number): string {
    if (value == null) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  }

  protected formatTime(isoString: string): string {
    if (!isoString) return '-';
    return dayjs(isoString).format('HH:mm');
  }

  protected formatDateTime(isoString: string): string {
    if (!isoString) return '-';
    return dayjs(isoString).format('DD/MM/YYYY HH:mm');
  }

  protected formatDate(isoString: string): string {
    if (!isoString) return '-';
    return dayjs(isoString).format('DD/MM/YYYY');
  }

  protected isStockCritical(alert: StockAlert): boolean {
    const daysUntilExpiry = dayjs(alert.expirationAt).diff(dayjs(), 'day');
    return daysUntilExpiry <= 3 || alert.quantity <= 2;
  }

  /** Hiển thị thời gian chờ xác nhận: “5 phút trước”, “2 giờ trước”. */
  protected waitingTime(isoString: string): string {
    if (!isoString) return '-';
    const diff = dayjs().diff(dayjs(isoString), 'minute');
    if (diff < 1) return 'Vừa tạo';
    if (diff < 60) return `${diff} phút trước`;
    const hours = Math.floor(diff / 60);
    return `${hours} giờ trước`;
  }

  /** True nếu booking đã chờ quá 30 phút không được xác nhận. */
  protected isBookingUrgent(isoString: string): boolean {
    return dayjs().diff(dayjs(isoString), 'minute') >= 30;
  }
}