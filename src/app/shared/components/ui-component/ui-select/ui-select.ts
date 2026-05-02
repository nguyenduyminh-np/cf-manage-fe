import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  inject,
} from '@angular/core';

export interface UiSelectOption<T = string | number> {
  label: string;
  value: T;
  disabled?: boolean;
}

@Component({
  standalone: true,
  selector: 'app-ui-select',
  templateUrl: './ui-select.html',
  styleUrl: './ui-select.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiSelectComponent {
  private readonly hostElement = inject(ElementRef<HTMLElement>);
  private readonly cdr = inject(ChangeDetectorRef);

  @Input() name = '';
  @Input() placeholder = 'Chọn';
  @Input() options: ReadonlyArray<UiSelectOption> = [];
  @Input() disabled = false;
  @Input() required = false;
  @Input() ariaLabel = '';
  @Input() value: string | number | null = null;
  @Output() valueChange = new EventEmitter<string | number | null>();

  protected open = false;

  protected get selectedLabel(): string {
    return this.options.find((option) => option.value === this.value)?.label ?? this.placeholder;
  }

  protected get isOpen(): boolean {
    return this.open && !this.disabled;
  }

  protected toggle(): void {
    if (this.disabled) {
      return;
    }

    this.open = !this.open;
    this.cdr.markForCheck();
  }

  protected select(option: UiSelectOption): void {
    if (this.disabled || option.disabled) {
      return;
    }

    this.value = option.value;
    this.open = false;
    this.valueChange.emit(this.value);
    this.cdr.markForCheck();
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target || !this.hostElement.nativeElement.contains(target)) {
      this.open = false;
      this.cdr.markForCheck();
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.open = false;
    this.cdr.markForCheck();
  }
}
