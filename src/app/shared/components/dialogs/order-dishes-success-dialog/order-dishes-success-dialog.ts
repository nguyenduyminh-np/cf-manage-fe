import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TuiDialogContext } from '@taiga-ui/core';
import { injectContext } from '@taiga-ui/polymorpheus';

import { environment } from '../../../../../environments/environment';

export interface OrderDishesSuccessDialogInput {
  dishOrderId: number;
  tableName: string;
  accountName: string;
  createdTime: string;
  dishOrderStatusName: string;
  note: string | null;
  totalBill: number;
  dishOrderDetails: {
    dishName: string;
    quantity: number;
    note: string | null;
    totalPrice: number;
    photo?: string | null;
  }[];
}

@Component({
  selector: 'app-order-dishes-success-dialog',
  standalone: true,
  imports: [CommonModule, DatePipe, DecimalPipe],
  templateUrl: './order-dishes-success-dialog.html',
  styleUrl: './order-dishes-success-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderDishesSuccessDialog {
  protected readonly context =
    injectContext<TuiDialogContext<boolean, OrderDishesSuccessDialogInput>>();
  protected readonly baseUrl = `${new URL(environment.apiUrl).origin}/`;

  protected get data(): OrderDishesSuccessDialogInput {
    return this.context.data;
  }

  protected close(result: boolean = false): void {
    this.context.completeWith(result);
  }

  protected printInvoice(): void {
    // Logic for printing invoice could go here
    this.close(true);
  }
}
