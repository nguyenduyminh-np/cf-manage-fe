import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  ViewChild,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface UiSelectOption<T = string | number | null> {
  label: string;
  value: T;
  disabled?: boolean;
}

@Component({
  standalone: true,
  selector: 'app-ui-select',
  imports: [FormsModule],
  templateUrl: './ui-select.html',
  styleUrl: './ui-select.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiSelectComponent {
  private readonly hostElement = inject(ElementRef<HTMLElement>);
  private readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('searchInput') private searchInput?: ElementRef<HTMLInputElement>;

  @Input() name = '';
  @Input() placeholder = 'Chọn';
  @Input() options: ReadonlyArray<UiSelectOption> = [];
  @Input() disabled = false;
  @Input() required = false;
  @Input() ariaLabel = '';
  @Input() value: string | number | null = null;
  @Input() searchable = false;
  @Input() searchPlaceholder = 'Tìm kiếm';
  @Output() valueChange = new EventEmitter<string | number | null>();

  protected open = false;
  protected searchTerm = '';

  protected get selectedLabel(): string {
    return this.options.find((option) => option.value === this.value)?.label ?? this.placeholder;
  }

  protected get filteredOptions(): ReadonlyArray<UiSelectOption> {
    const keyword = this.normalizeText(this.searchTerm);
    if (!keyword) {
      return this.options;
    }

    return this.options.filter((option) => this.normalizeText(option.label).includes(keyword));
  }

  protected get isOpen(): boolean {
    return this.open && !this.disabled;
  }

  protected toggle(): void {
    if (this.disabled) {
      return;
    }

    this.open = !this.open;
    if (this.open) {
      this.focusSearchInput();
    } else {
      this.searchTerm = '';
    }
    this.cdr.markForCheck();
  }

  protected select(option: UiSelectOption): void {
    if (this.disabled || option.disabled) {
      return;
    }

    this.value = option.value;
    this.close();
    this.valueChange.emit(this.value);
    this.cdr.markForCheck();
  }

  protected onSearchTermChange(): void {
    this.cdr.markForCheck();
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target || !this.hostElement.nativeElement.contains(target)) {
      this.close();
      this.cdr.markForCheck();
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.close();
    this.cdr.markForCheck();
  }

  private close(): void {
    this.open = false;
    this.searchTerm = '';
  }

  private focusSearchInput(): void {
    if (!this.searchable) {
      return;
    }

    requestAnimationFrame(() => {
      this.searchInput?.nativeElement.focus();
      this.searchInput?.nativeElement.select();
    });
  }

  private normalizeText(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }
}
