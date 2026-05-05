import { Component, HostListener, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthFacade } from '../../../core/facade/auth.facade';
import { TokenStore } from '../../../core/services/auth/token.store';
import { JwtPayload } from '../../../core/models/base/auth.model';
import { decodeJwtPayload } from '../../../shared/utils/jwt.utils';
import { GlobalSearchService } from '../../../core/services/global-search/global-search.service';

@Component({
  selector: 'app-header',
  imports: [RouterLink],
  templateUrl: './app-header.html',
  styleUrl: './app-header.scss',
})
export class AppHeader {
  private readonly authFacade = inject(AuthFacade);
  protected readonly tokenStore = inject(TokenStore);
  private readonly globalSearchService = inject(GlobalSearchService);

  isProfileMenuOpen = false;

  get userName(): string {
    const token = this.tokenStore.accessToken();
    if (!token) return 'User';
    try {
      const payload = decodeJwtPayload<JwtPayload>(token);
      return payload.sub || 'User';
    } catch {
      return 'User';
    }
  }

  get userRole(): string {
    return this.tokenStore.role() || 'Staff';
  }

  openSearch(): void {
    this.globalSearchService.open();
  }

  toggleProfileMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.isProfileMenuOpen = !this.isProfileMenuOpen;
  }

  closeProfileMenu(): void {
    this.isProfileMenuOpen = false;
  }

  onLogout(event: Event): void {
    event.preventDefault();
    this.closeProfileMenu();
    this.authFacade.logout().subscribe();
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.closeProfileMenu();
  }

  @HostListener('document:keydown.escape')
  onEscapePressed(): void {
    this.closeProfileMenu();
  }
}
