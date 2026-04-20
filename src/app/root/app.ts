import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TuiRoot } from '@taiga-ui/core/components/root';
import { AuthFacade } from '../core/facade/auth.facade';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TuiRoot],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  private readonly authFacade = inject(AuthFacade);
  protected readonly title = 'cf-manager';

  ngOnInit(): void {
    this.authFacade.restoreSession();
  }
}

