import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';


type DishCategory = 'freeze' | 'tra' | 'ca-phe' | 'phindi' | 'khac';

interface DishRow {
  no: number;
  photo: string | null;
  name: string;
  category: DishCategory;
  categoryLabel: string;
  price: number;
  createdAt: string;
}

@Component({
  standalone: true,
  selector: 'app-dish',
  imports: [CommonModule, FormsModule],
  templateUrl: './dish.html',
  styleUrl: './dish.scss',
})
export class Dish {
  protected searchText = '';
  protected selectedCategory = 'all';

  protected readonly categories = [
    { value: 'all',     label: 'Tất cả' },
    { value: 'freeze',  label: 'Freeze' },
    { value: 'phindi',  label: 'Phindi' },
    { value: 'ca-phe',  label: 'Cà phê' },
    { value: 'tra',     label: 'Trà' },
    { value: 'khac',    label: 'Khác' },
  ];

  protected readonly dishes: DishRow[] = [
    {
      no: 1,
      photo: null,
      name: 'Caramel phin freeze',
      category: 'freeze',
      categoryLabel: 'Freeze',
      price: 69000,
      createdAt: '12/10/2023',
    },
    {
      no: 2,
      photo: null,
      name: 'Trà sen vàng',
      category: 'tra',
      categoryLabel: 'Trà',
      price: 55000,
      createdAt: '15/09/2023',
    },
    {
      no: 3,
      photo: null,
      name: 'Phin sữa đá',
      category: 'ca-phe',
      categoryLabel: 'Cà phê',
      price: 39000,
      createdAt: '01/08/2023',
    },
    {
      no: 4,
      photo: null,
      name: 'Cà phê đen đá',
      category: 'ca-phe',
      categoryLabel: 'Cà phê',
      price: 35000,
      createdAt: '01/08/2023',
    },
    {
      no: 5,
      photo: null,
      name: 'Phindi choco',
      category: 'phindi',
      categoryLabel: 'Phindi',
      price: 55000,
      createdAt: '20/11/2023',
    },
    {
      no: 6,
      photo: null,
      name: 'Freeze trà xanh',
      category: 'freeze',
      categoryLabel: 'Freeze',
      price: 69000,
      createdAt: '12/10/2023',
    },
  ];

  protected readonly paginationItems = [
    { type: 'page' as const, label: '1', active: true },
    { type: 'page' as const, label: '2', active: false },
    { type: 'page' as const, label: '3', active: false },
    { type: 'ellipsis' as const, label: '...', active: false },
    { type: 'page' as const, label: '5', active: false },
  ];

  protected get filteredDishes(): DishRow[] {
    return this.dishes.filter((d) => {
      const matchCat = this.selectedCategory === 'all' || d.category === this.selectedCategory;
      const matchName = d.name.toLowerCase().includes(this.searchText.toLowerCase());
      return matchCat && matchName;
    });
  }

  protected formatPrice(price: number): string {
    return new Intl.NumberFormat('vi-VN').format(price) + '.000 đ';
  }

  protected categoryClass(category: DishCategory): string {
    return `dish-category-tag--${category}`;
  }
}
