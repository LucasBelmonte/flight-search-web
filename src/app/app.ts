import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { ThemeToggle } from './core/theme/theme-toggle';

@Component({
  imports: [RouterOutlet, ThemeToggle],
  selector: 'fs-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {}
