import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GlobalSearchService {
  private readonly isOpenSubject = new BehaviorSubject<boolean>(false);
  readonly isOpen$ = this.isOpenSubject.asObservable();

  get isOpen(): boolean {
    return this.isOpenSubject.value;
  }

  open(): void {
    this.isOpenSubject.next(true);
  }

  close(): void {
    this.isOpenSubject.next(false);
  }

  toggle(): void {
    this.isOpenSubject.next(!this.isOpen);
  }
}
