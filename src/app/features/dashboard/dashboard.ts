import { Component } from '@angular/core';

interface DashboardMetric {
  title: string;
  value: string;
  icon: string;
  iconFilled: boolean;
  iconToneClass: string;
  trend: string;
  trendIcon: 'trending_up' | 'trending_down' | 'check_circle';
  trendDirection: 'up' | 'down';
  progress: number | null;
  satisfactionBars: boolean[];
  note: string | null;
}

interface RevenuePoint {
  day: string;
  actual: number;
}

interface TopProduct {
  name: string;
  sold: string;
  trend: string;
  trendDirection: 'up' | 'down';
  note: string;
  image: string;
  alt: string;
}

type HeatLevel = 0 | 1 | 2 | 3;

@Component({
  selector: 'app-dashboard',
  imports: [],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  protected readonly metrics: DashboardMetric[] = [
    {
      title: 'Doanh thu ngày',
      value: '12.450.000đ',
      icon: 'payments',
      iconFilled: false,
      iconToneClass: 'metric-card__icon metric-card__icon--secondary',
      trend: '+12.5%',
      trendIcon: 'trending_up',
      trendDirection: 'up',
      progress: 75,
      satisfactionBars: [],
      note: null,
    },
    {
      title: 'Tổng đơn hàng',
      value: '142 đơn',
      icon: 'shopping_bag',
      iconFilled: false,
      iconToneClass: 'metric-card__icon metric-card__icon--tertiary',
      trend: '+8%',
      trendIcon: 'trending_up',
      trendDirection: 'up',
      progress: null,
      satisfactionBars: [],
      note: 'Dựa trên 8 giờ hoạt động gần nhất',
    },
    {
      title: 'Giá trị đơn TB',
      value: '87.500đ',
      icon: 'confirmation_number',
      iconFilled: false,
      iconToneClass: 'metric-card__icon metric-card__icon--accent',
      trend: '-2.4%',
      trendIcon: 'trending_down',
      trendDirection: 'down',
      progress: null,
      satisfactionBars: [],
      note: 'Mục tiêu: 95.000đ/đơn',
    },
    {
      title: 'Độ hài lòng',
      value: '4.8 / 5.0',
      icon: 'star',
      iconFilled: true,
      iconToneClass: 'metric-card__icon metric-card__icon--primary',
      trend: 'Excellent',
      trendIcon: 'check_circle',
      trendDirection: 'up',
      progress: null,
      satisfactionBars: [true, true, true, true, false],
      note: null,
    },
  ];

  protected readonly weeklyRevenue: RevenuePoint[] = [
    { day: 'T2', actual: 128 },
    { day: 'T3', actual: 96 },
    { day: 'T4', actual: 144 },
    { day: 'T5', actual: 80 },
    { day: 'T6', actual: 160 },
    { day: 'T7', actual: 176 },
    { day: 'CN', actual: 112 },
  ];

  protected readonly topProducts: TopProduct[] = [
    {
      name: 'Cà Phê Muối',
      sold: '428 ly đã bán',
      trend: '+18%',
      trendDirection: 'up',
      note: 'Xu hướng',
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuA-OxGI__4Zx3TWJuwX5ju85dP1rROCZYNy7SOZv1FBassjmgPxa-tBRokC5iqLxMyJyGc31VSFTPGZu-b61grOG8cDkhayQdMLbi4tydEmktZSDerZjlroFaWFSuFvQornojhfZz--dpmnQABnUqNWGJxjDfYxuU7jZI02eW0UdwbI7kqH-16PczyFUHErQLUouNXTD9_KaPeQlgZMz0ip-MjurrLfEWogpPRGz9-Fzw4CX8g3WByZrJTiR1NWmDGGhWmmF6QEIg',
      alt: 'Top-down macro shot of a traditional Vietnamese salted coffee in a glass.',
    },
    {
      name: 'Matcha Latte',
      sold: '315 ly đã bán',
      trend: '+12%',
      trendDirection: 'up',
      note: 'Ổn định',
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDat0m5Ce_LnOhHgEbnz00wMWirAMUXGNhRQHYQUwUASx2e4urylupgKELKFw9r_XTB_O1pv3CxJrNTiZnDocgJVCkAyeZuo1U7QsuHlzfzx6o6JLWM6eHBiVQVv-VUw3JxtoJ4_CGIBVNueegsK3zUNW-Vdngm7C2uD883ZNuM9_5lnd4DQ9rjIH0oqFNkZFZhWiifSpfHh5Hupp96SS0bqX-UUoX2M_P2LpJDQyodlpzeKl0jDaY_TyzbsUXc2v5MgBYqLbCkOg',
      alt: 'Close-up of hot matcha latte with latte art in a ceramic cup.',
    },
    {
      name: 'Cold Brew Cam Sả',
      sold: '289 ly đã bán',
      trend: '+5%',
      trendDirection: 'up',
      note: 'Mới',
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBYM4VbnKyo05CIBUbTZtZMT8Io-VDD_nh7vlPPo-ZTrPDqsdHoXebUFvW3WTP2x3IqOViz-6RxrgsqJ0cJJueUCx2GM_yACDGiqDcbPtF7K_D4N4B5BV7uaSYT_BzxqonxYDUigPrCIU9QE78rTRd0jua4eTesCNSNAsIbY3Ls7E2Z7sgKqMaa3cywMSjoqrLsdXQl94jxmEN8oUjEegsE1_2i343iA2F_fvukNWq8Cm4Ndrbu9iQIozMzp-l6eqYGzmrtHeC5lQ',
      alt: 'Bottle of artisanal cold brew on ice with citrus garnish.',
    },
    {
      name: 'Croissant Bơ Pháp',
      sold: '192 chiếc đã bán',
      trend: '-2%',
      trendDirection: 'down',
      note: 'Giảm',
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCnipcgNf7CLhXB1bn2C9x5unxSVe8XOCt_k1SHy2C8kV_5zYJCmF4LftE1uBnDEVzVlToHhPJUP0KJ93xwnBqqqm33ali79MwK9R3GtLMeSAumxyw0ORGJGWEpUlFqD-HC4_jXdTCefZeqH0FG60TTfeCW-BGD8dEH04SS_y1zLZNvpYOjlqG-SSCthugry3U7KGrNzSO7Hn3RPRMRz_E65V1J1L354F6iY_qGyAMX0jvB59RrUlOXHx6un75CNTBJIOw3HdONPA',
      alt: 'Freshly baked golden croissants on linen cloth.',
    },
  ];

  protected readonly heatmap: HeatLevel[] = [
    0, 0, 0, 0, 0, 1, 1, 2, 3, 3, 2, 2, 1, 1, 1, 2, 2, 3, 3, 2, 1, 1, 0, 0,
  ];

  protected heatClass(level: HeatLevel): string {
    return `heatmap__cell heatmap__cell--${level}`;
  }
}
