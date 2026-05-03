import { Component, HostListener, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AppHeader } from '../app-header/app-header';
import { AppFooter } from '../app-footer/app-footer';

interface MenuItem {
  name: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, AppHeader, AppFooter, RouterLink, RouterLinkActive],
  templateUrl: './app-admin-layout.html',
  styleUrl: './app-admin-layout.scss',
})
export class AppAdminLayout implements OnInit, OnDestroy {
  private readonly autoCollapseViewportWidth = 960;
  private readonly dateTimeFormatter = new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  private timeTickerId: number | null = null;
  private timeSyncTimeoutId: number | null = null;

  protected isSidebarCollapsed = false;
  protected readonly currentTime = signal(new Date());

  protected readonly menuItems: MenuItem[] = [
    { name: 'Dashboard', icon: 'monitoring', route: '/dashboard' },
    { name: 'Đặt bàn', icon: 'event_seat', route: '/booking' },
    { name: 'Hóa đơn', icon: 'receipt_long', route: '/invoice' },
    { name: 'Món ăn', icon: 'restaurant_menu', route: '/dish' },
    { name: 'Nguyên liệu', icon: 'kitchen', route: '/ingredient' },
    { name: 'Đơn đặt hàng', icon: 'input', route: '/purchase-order' },
    { name: 'Nhà cung cấp', icon: 'local_shipping', route: '/supplier' },
    { name: 'Kho lưu trữ', icon: 'inventory_2', route: '/warehouse' },
    { name: 'Quản lý tài khoản', icon: 'manage_accounts', route: '/account' },
  ];

  ngOnInit(): void {
    this.applyAutoCollapseByViewport();
    this.startClock();
  }

  ngOnDestroy(): void {
    if (this.timeSyncTimeoutId !== null) {
      window.clearTimeout(this.timeSyncTimeoutId);
      this.timeSyncTimeoutId = null;
    }
    if (this.timeTickerId !== null) {
      window.clearInterval(this.timeTickerId);
      this.timeTickerId = null;
    }
  }

  @HostListener('window:resize')
  protected onWindowResize(): void {
    this.applyAutoCollapseByViewport();
  }

  protected toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  private applyAutoCollapseByViewport(): void {
    if (typeof window === 'undefined') {
      return;
    }

    if (window.innerWidth <= this.autoCollapseViewportWidth && !this.isSidebarCollapsed) {
      this.toggleSidebar();
    }
  }

  private startClock(): void {
    this.currentTime.set(new Date());

    const now = new Date();
    const msToNextMinute = 60000 - (now.getSeconds() * 1000 + now.getMilliseconds());

    this.timeSyncTimeoutId = window.setTimeout(() => {
      this.currentTime.set(new Date());
      this.timeTickerId = window.setInterval(() => {
        this.currentTime.set(new Date());
      }, 60000);
    }, msToNextMinute);
  }

  protected get currentTimeLabel(): string {
    return this.dateTimeFormatter.format(this.currentTime());
  }

  protected get shiftLabel(): string {
    const hour = this.currentTime().getHours();
    if (hour >= 6 && hour < 14) {
      return 'Ca sáng';
    }
    if (hour >= 14 && hour < 22) {
      return 'Ca chiều';
    }
    return 'Ca tối';
  }
}
