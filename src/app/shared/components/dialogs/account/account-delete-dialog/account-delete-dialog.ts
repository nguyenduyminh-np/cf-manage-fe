import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TuiButton, TuiDialogContext } from '@taiga-ui/core';
import { injectContext } from '@taiga-ui/polymorpheus';
import { AccountListItem } from '../../../../../core/models/account/account.model';

export interface AccountDeleteDialogInput {
  account: AccountListItem;
}

@Component({
  standalone: true,
  selector: 'app-account-delete-dialog',
  imports: [TuiButton],
  templateUrl: './account-delete-dialog.html',
  styleUrl: './account-delete-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountDeleteDialog {
  protected readonly context = injectContext<TuiDialogContext<boolean, AccountDeleteDialogInput>>();

  protected readonly account = this.context.data.account;

  protected confirm(): void {
    this.context.completeWith(true);
  }

  protected cancel(): void {
    this.context.completeWith(false);
  }
}
