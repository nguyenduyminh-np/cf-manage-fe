import { Component } from '@angular/core';

type InvoiceStatus = 'PAID' | 'PENDING';
type PaymentMethod = 'BANK' | 'CASH';

interface PaginationItem {
  type: 'page' | 'ellipsis';
  label: string;
  active?: boolean;
}

interface InvoiceRow {
  no: string;
  code: string;
  totalAmount: string;
  status: InvoiceStatus;
  paymentMethod: PaymentMethod;
  createdBy: string;
  createdAt: string;
}

@Component({
  selector: 'app-invoice',
  imports: [],
  templateUrl: './invoice.html',
  styleUrl: './invoice.scss',
})
export class Invoice {
  protected readonly invoices: InvoiceRow[] = [
    {
      no: '01',
      code: 'HD-2024-001',
      totalAmount: '125,000 đ',
      status: 'PAID',
      paymentMethod: 'BANK',
      createdBy: 'Nguyen Van A',
      createdAt: '12/10/2023 08:30',
    },
    {
      no: '02',
      code: 'HD-2024-002',
      totalAmount: '85,000 đ',
      status: 'PENDING',
      paymentMethod: 'CASH',
      createdBy: 'Tran Thi B',
      createdAt: '12/10/2023 09:15',
    },
    {
      no: '03',
      code: 'HD-2024-003',
      totalAmount: '210,000 đ',
      status: 'PAID',
      paymentMethod: 'BANK',
      createdBy: 'Le Cong C',
      createdAt: '12/10/2023 10:45',
    },
    {
      no: '04',
      code: 'HD-2024-004',
      totalAmount: '45,000 đ',
      status: 'PAID',
      paymentMethod: 'CASH',
      createdBy: 'Nguyen Van A',
      createdAt: '12/10/2023 11:20',
    },
    {
      no: '05',
      code: 'HD-2024-005',
      totalAmount: '178,000 đ',
      status: 'PAID',
      paymentMethod: 'BANK',
      createdBy: 'Pham Thi D',
      createdAt: '12/10/2023 12:05',
    },
    {
      no: '06',
      code: 'HD-2024-006',
      totalAmount: '67,000 đ',
      status: 'PENDING',
      paymentMethod: 'CASH',
      createdBy: 'Vo Minh E',
      createdAt: '12/10/2023 13:40',
    },
    {
      no: '07',
      code: 'HD-2024-007',
      totalAmount: '350,000 đ',
      status: 'PAID',
      paymentMethod: 'BANK',
      createdBy: 'Đỗ Minh H',
      createdAt: '12/10/2023 14:20',
    },
    {
      no: '08',
      code: 'HD-2024-008',
      totalAmount: '92,000 đ',
      status: 'PENDING',
      paymentMethod: 'CASH',
      createdBy: 'Phan Thị K',
      createdAt: '12/10/2023 15:10',
    },
    {
      no: '09',
      code: 'HD-2024-009',
      totalAmount: '155,000 đ',
      status: 'PAID',
      paymentMethod: 'BANK',
      createdBy: 'Vũ Quốc L',
      createdAt: '12/10/2023 16:35',
    },
    {
      no: '10',
      code: 'HD-2024-010',
      totalAmount: '73,000 đ',
      status: 'PAID',
      paymentMethod: 'CASH',
      createdBy: 'Nguyễn Văn A',
      createdAt: '12/10/2023 17:00',
    },
  ];

  protected readonly paginationItems: PaginationItem[] = [
    { type: 'page', label: '1', active: true },
    { type: 'page', label: '2' },
    { type: 'page', label: '3' },
    { type: 'ellipsis', label: '...' },
    { type: 'page', label: '8' },
  ];

  protected statusLabel(status: InvoiceStatus): string {
    return status === 'PAID' ? 'Đã thanh toán' : 'Chờ thanh toán';
  }

  protected statusClass(status: InvoiceStatus): string {
    return status === 'PAID' ? 'invoice-status--paid' : 'invoice-status--pending';
  }

  protected paymentIcon(method: PaymentMethod): string {
    return method === 'BANK' ? 'account_balance' : 'payments';
  }

  protected paymentLabel(method: PaymentMethod): string {
    return method === 'BANK' ? 'Chuyển khoản' : 'Tiền mặt';
  }
}
