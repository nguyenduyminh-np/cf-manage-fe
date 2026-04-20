import { Component, HostListener, OnInit, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AppHeader } from '../app-header/app-header';
import { AppFooter } from '../app-footer/app-footer';

interface MenuItem {
  name: string;
  icon: string;
  route: string;
}

interface DialogMenuItem {
  key: string;
  name: string;
  route: string;
}

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, AppHeader, AppFooter, RouterLink, RouterLinkActive],
  templateUrl: './app-admin-layout.html',
  styleUrl: './app-admin-layout.scss',
})
export class AppAdminLayout implements OnInit {
  private readonly router = inject(Router);
  private readonly autoCollapseViewportWidth = 960;

  protected isDialogMenuOpen = false;
  protected isSidebarCollapsed = false;

  protected readonly menuItems: MenuItem[] = [
    { name: 'Dashboard', icon: 'monitoring', route: '/dashboard' },
    { name: 'Đặt bàn', icon: 'event_seat', route: '/booking' },
    { name: 'Tài chính', icon: 'account_balance_wallet', route: '/cash-flow' },
    { name: 'Món ăn', icon: 'restaurant_menu', route: '/dish' },
    { name: 'Nguyên liệu', icon: 'kitchen', route: '/ingredient' },
    { name: 'Hóa đơn', icon: 'receipt_long', route: '/invoice' },
    { name: 'Đơn đặt hàng', icon: 'input', route: '/purchase-order' },
    //  { name: '', icon: 'stacked_bar_chart', route: '/stock-level' },
    { name: 'Nhà cung cấp', icon: 'local_shipping', route: '/supplier' },
    { name: 'Kho lưu trữ', icon: 'inventory_2', route: '/warehouse' },
    { name: 'Tài khoản', icon: 'manage_accounts', route: '/account' },
    { name: 'Đăng ký', icon: 'person_add', route: '/register' },
  ];

  protected readonly dialogMenuItems: DialogMenuItem[] = [
    {
      key: 'table-detail-dialog',
      name: 'Table Detail Dialog',
      route: '/dialogs/table-detail-dialog',
    },
    {
      key: 'table-booking-history',
      name: 'Table Booking History',
      route: '/dialogs/table-booking-history',
    },
    {
      key: 'table-booking-detail',
      name: 'Table Booking Detail',
      route: '/dialogs/table-booking-detail',
    },
    {
      key: 'order-dishes-dialog',
      name: 'Order Dishes Dialog',
      route: '/dialogs/order-dishes-dialog',
    },
    {
      key: 'pos-order-dishes',
      name: 'POS Order Dishes',
      route: '/dialogs/pos-order-dishes',
    },
  ];

  ngOnInit(): void {
    this.applyAutoCollapseByViewport();
  }

  @HostListener('window:resize')
  protected onWindowResize(): void {
    this.applyAutoCollapseByViewport();
  }

  protected toggleDialogMenu(): void {
    if (this.isSidebarCollapsed) {
      return;
    }

    this.isDialogMenuOpen = !this.isDialogMenuOpen;
  }

  protected toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;

    if (this.isSidebarCollapsed) {
      this.isDialogMenuOpen = false;
    }
  }

  protected get shouldShowDialogMenu(): boolean {
    return !this.isSidebarCollapsed && (this.isDialogMenuOpen || this.isDialogRoute);
  }

  protected get isDialogRoute(): boolean {
    return this.router.url.startsWith('/dialogs');
  }

  private applyAutoCollapseByViewport(): void {
    if (typeof window === 'undefined') {
      return;
    }

    if (window.innerWidth <= this.autoCollapseViewportWidth && !this.isSidebarCollapsed) {
      this.toggleSidebar();
    }
  }
}
