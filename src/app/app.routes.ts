import { Routes } from '@angular/router';
import { AppAdminLayout } from './layout/admin-layout/app-admin-layout/app-admin-layout';
import { authGuard } from './core/guards/auth.guard';
import { rolesGuard } from './core/guards/roles.guard';

// ─── Shorthand cho "chỉ ADMIN hoặc bất kỳ Manager (QL-xxx)" ───
const ADMIN_OR_MANAGER = ['ADMIN', 'QL-*'];

export const routes: Routes = [
  // ─── Public Routes (không có sidebar/layout) ───
  {
    path: 'login',
    loadComponent: () => import('./layout/login-page/login-page').then(m => m.LoginPage),
  },
  {
    path: 'register',
    loadComponent: () => import('./layout/register-page/register-page').then(m => m.RegisterPage),
  },
  {
    path: 'forbidden',
    loadComponent: () => import('./features/forbidden/forbidden.page').then(m => m.ForbiddenPage),
  },

  // ─── Protected Routes (AdminLayout + authGuard) ───
  {
    path: '',
    component: AppAdminLayout,
    canMatch: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      
      // ── Accessible by all authenticated roles ──
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard').then(m => m.Dashboard),
      },
      {
        path: 'booking',
        loadComponent: () => import('./features/booking/booking').then(m => m.Booking),
      },
      {
        path: 'invoice',
        loadComponent: () => import('./features/invoice/invoice').then(m => m.Invoice),
      },

      // ── ADMIN + MANAGER only ──
      {
        path: 'dish',
        canMatch: [rolesGuard(ADMIN_OR_MANAGER)],
        loadComponent: () => import('./features/dish/dish').then(m => m.Dish),
      },
      {
        path: 'ingredient',
        canMatch: [rolesGuard(ADMIN_OR_MANAGER)],
        loadComponent: () => import('./features/ingredient/ingredient').then(m => m.Ingredient),
      },
      {
        path: 'purchase-order',
        canMatch: [rolesGuard(ADMIN_OR_MANAGER)],
        loadComponent: () => import('./features/purchase-order/purchase-order').then(m => m.PurchaseOrder),
      },
      {
        path: 'supplier',
        canMatch: [rolesGuard(ADMIN_OR_MANAGER)],
        loadComponent: () => import('./features/supplier/supplier').then(m => m.Supplier),
      },
      {
        path: 'warehouse',
        canMatch: [rolesGuard(ADMIN_OR_MANAGER)],
        loadComponent: () => import('./features/warehouse/warehouse').then(m => m.Warehouse),
      },
      {
        path: 'voucher',
        canMatch: [rolesGuard(ADMIN_OR_MANAGER)],
        loadComponent: () => import('./features/voucher/voucher').then(m => m.Voucher),
      },

      // ── ADMIN only ──
      {
        path: 'account',
        canMatch: [rolesGuard(['ADMIN'])],
        loadComponent: () => import('./features/account/account').then(m => m.Account),
      },

      // ── Dialogs ──
      {
        path: 'dialogs',
        redirectTo: 'dialogs/table-detail-dialog',
        pathMatch: 'full',
      },
      {
        path: 'dialogs/:dialogKey',
        loadComponent: () =>
          import('./features/dialogs/dialog-catalog/dialog-catalog').then(m => m.DialogCatalog),
      },
    ],
  },

  // ─── Fallback ───
  { path: '**', redirectTo: '/dashboard' },
];
