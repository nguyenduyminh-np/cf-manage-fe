import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TuiButton, TuiDialogContext } from '@taiga-ui/core';
import { injectContext } from '@taiga-ui/polymorpheus';

export interface ConfirmDialogData {
  message: string;
  confirmText?: string;
  cancelText?: string;
}

@Component({
  standalone: true,
  imports: [CommonModule, TuiButton],
  template: `
    <p class="type-body-md text-measure" [innerHTML]="context.data.message"></p>
    <div class="actions">
      <button tuiButton size="m" appearance="outline" (click)="context.completeWith(false)">
        {{ context.data.cancelText || 'Hủy' }}
      </button>
      <button tuiButton size="m" appearance="primary" (click)="context.completeWith(true)">
        {{ context.data.confirmText || 'Xác nhận' }}
      </button>
    </div>
  `,
  styles: [
    `
      .actions {
        display: flex;
        justify-content: flex-end;
        gap: 1rem;
        margin-top: 1.5rem;
      }
    `,
  ],
})
export class ConfirmDialog {
  protected readonly context = injectContext<TuiDialogContext<boolean, ConfirmDialogData>>();
}
