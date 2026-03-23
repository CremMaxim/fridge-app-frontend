import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';

import {
  DsaAppShellComponent,
  DsaMenuService,
} from '@dsa/design-system-angular';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, DsaAppShellComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App implements OnInit {
  private readonly menuService = inject(DsaMenuService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    this.menuService.menu = {
      items: [
        {
          label: 'Dashboard',
          path: '/',
          icon: 'dashboard',
          selectable: true,
          enabled: true,
        },
        {
          label: 'Manage Items',
          path: '/items',
          icon: 'inventory_2',
          selectable: true,
          enabled: true,
        },
        {
          label: 'Expiry Calendar',
          path: '/calendar',
          icon: 'calendar_month',
          selectable: true,
          enabled: true,
        },
      ],
    };

    // Highlight menu item on navigation
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(e => {
        this.menuService.highlightMenuByPath((e as NavigationEnd).urlAfterRedirects);
      });

    // Highlight on initial load
    this.menuService.highlightMenuByPath(this.router.url);
  }
}
