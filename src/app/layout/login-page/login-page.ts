import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TuiButton } from '@taiga-ui/core';
import { startWith } from 'rxjs';

import { AuthFacade } from '../../core/facade/auth.facade';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, TuiButton, RouterLink],
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authFacade = inject(AuthFacade);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly submitAttempted = signal(false);
  protected readonly isLoading = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly sessionRevokedMessage = signal<string | null>(null);

  protected readonly loginForm = this.fb.nonNullable.group({
    username: [
      '',
      [
        Validators.required,
        Validators.minLength(4),
        Validators.maxLength(30),
        Validators.pattern(/^[a-zA-Z0-9_]+$/),
      ],
    ],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  private readonly loginFormStatus = toSignal(
    this.loginForm.statusChanges.pipe(startWith(this.loginForm.status)),
    { initialValue: this.loginForm.status },
  );

  protected readonly canSubmit = computed(
    () => this.loginFormStatus() === 'VALID' && !this.isLoading(),
  );
  protected readonly isSubmitDisabled = computed(() => !this.canSubmit());

  ngOnInit(): void {
    // Kiểm tra nếu bị redirect do session revoked
    const reason = this.route.snapshot.queryParamMap.get('reason');
    if (reason === 'session_revoked') {
      this.sessionRevokedMessage.set('Phiên làm việc đã bị kết thúc ở nơi khác. Vui lòng đăng nhập lại.');
    }
  }

  protected showFieldError(fieldName: 'username' | 'password'): boolean {
    const control = this.loginForm.controls[fieldName];
    return control.invalid && (control.touched || this.submitAttempted());
  }

  protected submit(): void {
    this.submitAttempted.set(true);
    this.serverError.set(null);
    this.loginForm.markAllAsTouched();

    if (!this.canSubmit()) {
      return;
    }

    this.isLoading.set(true);
    this.loginForm.disable();

    const { username, password } = this.loginForm.getRawValue();

    this.authFacade.login({ username, password }).subscribe({
      next: () => {
        this.isLoading.set(false);
        // Navigate đến returnUrl hoặc dashboard
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/dashboard';
        this.router.navigateByUrl(returnUrl);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.loginForm.enable();
        // Server error message sẽ được hiển thị bởi global error interceptor (toast)
        // Nhưng ta cũng hiển thị inline cho UX tốt hơn
        const apiError = err?.error;
        if (apiError?.message) {
          this.serverError.set(apiError.message);
        } else if (apiError?.code) {
          this.serverError.set(apiError.code === 'BAD_CREDENTIALS'
            ? 'Sai tên đăng nhập hoặc mật khẩu'
            : `Lỗi: ${apiError.code}`);
        } else {
          this.serverError.set('Đã xảy ra lỗi, vui lòng thử lại.');
        }
      },
    });
  }
}
