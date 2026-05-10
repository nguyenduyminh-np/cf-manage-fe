import { Component } from '@angular/core';
import { TuiButton, TuiDialogContext } from '@taiga-ui/core';
import { injectContext } from '@taiga-ui/polymorpheus';

@Component({
  standalone: true,
  imports: [TuiButton],
  template: `
    <p>Bạn có chắc muốn xóa <strong>{{ context.data.name }}</strong>?</p>
    <div class="actions">
      <button tuiButton size="m" appearance="outline" (click)="context.completeWith(false)">Hủy</button>
      <button tuiButton size="m" appearance="primary" (click)="context.completeWith(true)">Xóa</button>
    </div>
  `,
})
export class ConfirmDeleteDialog {
  protected readonly context = injectContext<TuiDialogContext<boolean, { name: string }>>();
}
