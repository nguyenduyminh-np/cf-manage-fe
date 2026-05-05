import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  inject,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { GlobalSearchService } from '../../../core/services/global-search/global-search.service';

interface SearchItem {
  id: string;
  title: string;
  icon: string;
  route: string;
  category: 'Modules' | 'Recent';
}

@Component({
  standalone: true,
  selector: 'app-global-search',
  imports: [CommonModule, FormsModule],
  templateUrl: './global-search.html',
  styleUrl: './global-search.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GlobalSearchComponent implements OnInit, OnDestroy {
  private readonly globalSearchService = inject(GlobalSearchService);
  private readonly router = inject(Router);

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  isOpen = this.globalSearchService.isOpen$;
  searchTerm = signal('');

  private readonly allItems: SearchItem[] = [
    { id: '1', title: 'Dashboard', icon: 'dashboard', route: '/dashboard', category: 'Modules' },
    { id: '2', title: 'Đặt bàn', icon: 'table_restaurant', route: '/booking', category: 'Modules' },
    { id: '3', title: 'Hóa đơn', icon: 'receipt_long', route: '/invoice', category: 'Modules' },
    { id: '4', title: 'Món ăn', icon: 'restaurant_menu', route: '/dish', category: 'Modules' },
    { id: '5', title: 'Nguyên liệu', icon: 'kitchen', route: '/ingredient', category: 'Modules' },
    { id: '6', title: 'Đơn đặt hàng', icon: 'shopping_cart', route: '/purchase-order', category: 'Modules' },
    { id: '7', title: 'Nhà cung cấp', icon: 'local_shipping', route: '/supplier', category: 'Modules' },
    { id: '8', title: 'Kho lưu trữ', icon: 'inventory_2', route: '/warehouse', category: 'Modules' },
    { id: '9', title: 'Quản lý tài khoản', icon: 'manage_accounts', route: '/account', category: 'Modules' },
  ];

  filteredItems = signal<SearchItem[]>(this.allItems);
  selectedIndex = signal<number>(0);

  ngOnInit(): void {
    // Focus input when opened
    this.isOpen.subscribe((open) => {
      if (open) {
        this.searchTerm.set('');
        this.filterResults('');
        setTimeout(() => {
          this.searchInput?.nativeElement?.focus();
        }, 100);
      }
    });
  }

  ngOnDestroy(): void {}

  close(): void {
    this.globalSearchService.close();
  }

  onSearchChange(term: string): void {
    this.searchTerm.set(term);
    this.filterResults(term);
  }

  private filterResults(term: string): void {
    const lowerTerm = term.toLowerCase().trim();
    if (!lowerTerm) {
      this.filteredItems.set(this.allItems);
    } else {
      const filtered = this.allItems.filter((item) =>
        item.title.toLowerCase().includes(lowerTerm)
      );
      this.filteredItems.set(filtered);
    }
    this.selectedIndex.set(0);
  }

  navigate(item: SearchItem): void {
    this.close();
    this.router.navigate([item.route]);
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    if (!this.globalSearchService.isOpen) return;

    if (event.key === 'Escape') {
      this.close();
      event.preventDefault();
      return;
    }

    const items = this.filteredItems();
    if (items.length === 0) return;

    if (event.key === 'ArrowDown') {
      this.selectedIndex.update((i) => (i + 1) % items.length);
      event.preventDefault();
      this.scrollSelectedIntoView();
    } else if (event.key === 'ArrowUp') {
      this.selectedIndex.update((i) => (i - 1 + items.length) % items.length);
      event.preventDefault();
      this.scrollSelectedIntoView();
    } else if (event.key === 'Enter') {
      const selected = items[this.selectedIndex()];
      if (selected) {
        this.navigate(selected);
      }
      event.preventDefault();
    }
  }

  private scrollSelectedIntoView(): void {
    setTimeout(() => {
      const selectedEl = document.querySelector('.result-item.selected');
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }, 0);
  }
}
