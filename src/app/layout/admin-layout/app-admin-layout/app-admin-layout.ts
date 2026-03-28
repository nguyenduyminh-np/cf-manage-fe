import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AppHeader } from "../app-header/app-header";
import { AppFooter } from "../app-footer/app-footer";

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, AppHeader, AppFooter, RouterLink, RouterLinkActive],
  templateUrl: './app-admin-layout.html',
  styleUrl: './app-admin-layout.scss',
})
export class AppAdminLayout {
  menuItems = [
    { name: 'Dashboard', icon: 'monitoring', route: '/dashboard' },
    { name: 'Booking', icon: 'event_seat', route: '/booking' },
    { name: 'Cash Flow', icon: 'account_balance_wallet', route: '/cash-flow' },
    { name: 'Dishes', icon: 'restaurant_menu', route: '/dish' },
    { name: 'Ingredients', icon: 'kitchen', route: '/ingredient' },
    { name: 'Invoices', icon: 'receipt_long', route: '/invoice' },
    { name: 'Purchase Orders', icon: 'input', route: '/purchase-order' },
    { name: 'Stock Levels', icon: 'stacked_bar_chart', route: '/stock-level' },
    { name: 'Suppliers', icon: 'local_shipping', route: '/supplier' },
    { name: 'Warehouse', icon: 'inventory_2', route: '/warehouse' },
    { name: 'Accounts', icon: 'manage_accounts', route: '/account' },
  ];
}
