import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface BreadcrumbItem {
  label: string;
  /** Nếu có routerLink thì render thành link, ngược lại là text thường (item cuối cùng) */
  routerLink?: string | string[];
  icon?: string;
}

@Component({
  standalone: true,
  selector: 'app-breadcrumb',
  imports: [RouterLink],
  template: `
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <ol class="breadcrumb__list">
        @for (item of items(); track $index; let last = $last) {
          <li class="breadcrumb__item" [class.breadcrumb__item--active]="last">
            @if (!last && item.routerLink) {
              <a class="breadcrumb__link" [routerLink]="item.routerLink">
                @if (item.icon) {
                  <span class="material-symbols-outlined breadcrumb__icon" aria-hidden="true">{{ item.icon }}</span>
                }
                <span>{{ item.label }}</span>
              </a>
            } @else {
              <span class="breadcrumb__current">
                @if (item.icon) {
                  <span class="material-symbols-outlined breadcrumb__icon" aria-hidden="true">{{ item.icon }}</span>
                }
                <span>{{ item.label }}</span>
              </span>
            }
            @if (!last) {
              <span class="breadcrumb__separator" aria-hidden="true">
                <span class="material-symbols-outlined">chevron_right</span>
              </span>
            }
          </li>
        }
      </ol>
    </nav>
  `,
  styleUrl: './breadcrumb.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BreadcrumbComponent {
  readonly items = input.required<BreadcrumbItem[]>();
}
