import { Routes } from '@angular/router';
import { AppAdminLayout } from './layout/admin-layout/app-admin-layout/app-admin-layout';

export const routes: Routes = [
  {
    path: '',
    component: AppAdminLayout,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'booking',
        loadComponent: () => import('./features/booking/booking').then((m) => m.Booking),
      },
      {
        path: 'cash-flow',
        loadComponent: () => import('./features/cash-flow/cash-flow').then((m) => m.CashFlow),
      },
      { path: 'dish', loadComponent: () => import('./features/dish/dish').then((m) => m.Dish) },
      {
        path: 'ingredient',
        loadComponent: () => import('./features/ingredient/ingredient').then((m) => m.Ingredient),
      },
      {
        path: 'invoice',
        loadComponent: () => import('./features/invoice/invoice').then((m) => m.Invoice),
      },
      {
        path: 'purchase-order',
        loadComponent: () =>
          import('./features/purchase-order/purchase-order').then((m) => m.PurchaseOrder),
      },
      {
        path: 'stock-level',
        loadComponent: () => import('./features/stock-level/stock-level').then((m) => m.StockLevel),
      },
      {
        path: 'supplier',
        loadComponent: () => import('./features/supplier/supplier').then((m) => m.Supplier),
      },
      {
        path: 'warehouse',
        loadComponent: () => import('./features/warehouse/warehouse').then((m) => m.Warehouse),
      },
      {
        path: 'account',
        loadComponent: () => import('./features/account/account').then((m) => m.Account),
      },
      {
        path: 'user-profile',
        loadComponent: () =>
          import('./features/user-profile/user-profile').then((m) => m.UserProfile),
      },
    ],
  },
];
