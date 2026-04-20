import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TuiButton } from '@taiga-ui/core';
import { startWith } from 'rxjs';

import { AuthFacade } from '../../core/facade/auth.facade';

@Component({
  selector: 'app-register-page',
  imports: [ReactiveFormsModule, TuiButton, RouterLink],
  templateUrl: './register-page.html',
  styleUrl: './register-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterPage {
  private readonly fb = inject(FormBuilder);
  private readonly authFacade = inject(AuthFacade);
  private readonly router = inject(Router);

  protected readonly submitAttempted = signal(false);
  protected readonly isLoading = signal(false);
  protected readonly serverError = signal<string | null>(null);

  protected readonly registerForm = this.fb.nonNullable.group({
    username: [
      '',
      [
        Validators.required,
        Validators.minLength(4),
        Validators.maxLength(30),
        Validators.pattern(/^[a-zA-Z0-9_]+$/),
      ],
    ],
    fullName: ['', [Validators.required, Validators.maxLength(100)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  private readonly registerFormStatus = toSignal(
    this.registerForm.statusChanges.pipe(startWith(this.registerForm.status)),
    { initialValue: this.registerForm.status },
  );

  protected readonly canSubmit = computed(
    () => this.registerFormStatus() === 'VALID' && !this.isLoading(),
  );

  protected readonly isSubmitDisabled = computed(() => !this.canSubmit());

  protected showFieldError(fieldName: 'username' | 'password' | 'fullName'): boolean {
    const control = this.registerForm.controls[fieldName];
    return control.invalid && (control.touched || this.submitAttempted());
  }

  protected submit(): void {
    this.submitAttempted.set(true);
    this.serverError.set(null);
    this.registerForm.markAllAsTouched();

    if (!this.canSubmit()) {
      return;
    }

    this.isLoading.set(true);
    this.registerForm.disable();

    const { username, password, fullName } = this.registerForm.getRawValue();

    this.authFacade.register({ username, password, fullName }).subscribe({
      next: () => {
        this.isLoading.set(false);
        // Register trả về token + auto-login ở backend, 
        // Facade đã handle set token, chỉ cần redirect.
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.registerForm.enable();

        const apiError = err?.error;
        if (apiError?.message) {
          this.serverError.set(apiError.message);
        } else if (apiError?.code === 'DUPLICATED_USERNAME') {
          this.serverError.set('Tên đăng nhập đã tồn tại, vui lòng chọn tên khác.');
        } else {
          this.serverError.set('Đã xảy ra lỗi khi đăng ký, vui lòng thử lại.');
        }
      },
    });
  }
}
