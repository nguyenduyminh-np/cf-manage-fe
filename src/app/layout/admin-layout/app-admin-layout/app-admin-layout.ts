import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AppHeader } from '../app-header/app-header';
import { AppFooter } from '../app-footer/app-footer';

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, AppHeader, AppFooter, RouterLink, RouterLinkActive],
  templateUrl: './app-admin-layout.html',
  styleUrl: './app-admin-layout.scss',
})
export class AppAdminLayout {
  menuItems = [
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
  ];
}
