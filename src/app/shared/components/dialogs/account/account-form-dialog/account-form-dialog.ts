import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TuiButton, TuiDialogContext } from '@taiga-ui/core';
import { injectContext } from '@taiga-ui/polymorpheus';

import {
  AccountCreateRequest,
  AccountListItem,
  AccountUpdateRequest,
} from '../../../../../core/models/account/account.model';

export interface AccountFormDialogInput {
  mode: 'create' | 'edit';
  account: AccountListItem | null;
}

@Component({
  standalone: true,
  selector: 'app-account-form-dialog',
  imports: [FormsModule, TuiButton],
  templateUrl: './account-form-dialog.html',
  styleUrl: './account-form-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountFormDialog {
  protected readonly context =
    injectContext<
      TuiDialogContext<AccountCreateRequest | AccountUpdateRequest | null, AccountFormDialogInput>
    >();

  protected readonly isEdit = this.context.data.mode === 'edit';
  private readonly src = this.context.data.account;

  protected formData = {
    id: this.src?.id ?? 0,
    accountCode: '',
    username: this.src?.username ?? '',
    password: '',
    fullName: this.src?.fullName ?? '',
    email: this.src?.email ?? '',
    phoneNumber: this.src?.phoneNumber ?? '',
    roleId: null as number | null,
    dateOfBirth: this.toDateInput(this.src?.dateOfBirth ?? ''),
    isActive: this.src?.isActive ?? true,
  };

  protected get isValid(): boolean {
    const hasBasics = !!this.formData.username.trim() && !!this.formData.fullName.trim();
    const hasRole = this.isEdit || (this.formData.roleId !== null && this.formData.roleId > 0);
    const hasDob = this.isEdit || !!this.formData.dateOfBirth;
    const hasPassword = this.isEdit || !!this.formData.password.trim();
    return hasBasics && hasRole && hasDob && hasPassword;
  }

  protected submit(): void {
    if (!this.isValid) return;

    if (this.isEdit) {
      const payload: AccountUpdateRequest = {
        id: this.formData.id,
        accountCode: this.formData.accountCode.trim() || undefined,
        username: this.formData.username.trim() || undefined,
        password: this.formData.password.trim() || undefined,
        fullName: this.formData.fullName.trim() || undefined,
        email: this.formData.email.trim() || undefined,
        phoneNumber: this.formData.phoneNumber.trim() || undefined,
        roleId: this.formData.roleId ?? undefined,
        dateOfBirth: this.formData.dateOfBirth || undefined,
        isActive: this.formData.isActive,
      };
      this.context.completeWith(payload);
      return;
    }

    const payload: AccountCreateRequest = {
      accountCode: this.formData.accountCode.trim() || undefined,
      username: this.formData.username.trim(),
      password: this.formData.password.trim(),
      fullName: this.formData.fullName.trim(),
      email: this.formData.email.trim() || undefined,
      phoneNumber: this.formData.phoneNumber.trim() || undefined,
      roleId: this.formData.roleId ?? 0,
      dateOfBirth: this.formData.dateOfBirth,
    };
    this.context.completeWith(payload);
  }

  protected cancel(): void {
    this.context.completeWith(null);
  }

  private toDateInput(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  }
}
